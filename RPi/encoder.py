import logging
import queue
import threading
from time import monotonic, sleep
from typing import Optional

import RPi.GPIO as GPIO

logger = logging.getLogger(__name__)


class EncoderController:
    """Rotary encoder input controller that emits LEFT/RIGHT/ACK events."""

    EVENT_LEFT = "LEFT"
    EVENT_RIGHT = "RIGHT"
    EVENT_ACK = "ACK"

    def __init__(
        self,
        pin_a: int = 22,
        pin_b: int = 17,
        pin_button: int = 18,
        rotation_step: int = 4,
        poll_interval: float = 0.001,
    ) -> None:
        self.pin_a = pin_a
        self.pin_b = pin_b
        self.pin_button = pin_button
        self.rotation_step = rotation_step
        self.poll_interval = poll_interval

        self._events = queue.Queue(maxsize=64)
        self._running = False
        self._poll_thread: Optional[threading.Thread] = None

        self._use_edge_detect = False
        self._use_button_edge_detect = False

    def start(self) -> None:
        if self._running:
            return

        GPIO.setwarnings(True)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin_a, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(self.pin_b, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(self.pin_button, GPIO.IN, pull_up_down=GPIO.PUD_UP)

        try:
            GPIO.remove_event_detect(self.pin_a)
        except RuntimeError:
            pass

        try:
            GPIO.remove_event_detect(self.pin_button)
        except RuntimeError:
            pass

        try:
            GPIO.add_event_detect(
                self.pin_a,
                GPIO.RISING,
                callback=self._rotation_interrupt,
                bouncetime=10,
            )
            self._use_edge_detect = True
            logger.info("Encoder interrupt mode enabled")
        except RuntimeError as err:
            self._use_edge_detect = False
            logger.warning("Encoder interrupt unavailable (%s). Using polling mode.", err)

        try:
            GPIO.add_event_detect(
                self.pin_button,
                GPIO.FALLING,
                callback=self._button_interrupt,
                bouncetime=200,
            )
            self._use_button_edge_detect = True
            logger.info("Encoder button interrupt enabled")
        except RuntimeError as err:
            self._use_button_edge_detect = False
            logger.warning("Encoder button interrupt unavailable (%s). Using polling mode.", err)

        self._running = True
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

    def stop(self) -> None:
        self._running = False

        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=0.5)

        if self._use_edge_detect:
            try:
                GPIO.remove_event_detect(self.pin_a)
            except RuntimeError:
                pass

        if self._use_button_edge_detect:
            try:
                GPIO.remove_event_detect(self.pin_button)
            except RuntimeError:
                pass

    def read_event(self, timeout: float = 0.2) -> Optional[str]:
        try:
            return self._events.get(timeout=timeout)
        except queue.Empty:
            return None

    def _emit(self, event: str) -> None:
        try:
            self._events.put_nowait(event)
        except queue.Full:
            try:
                self._events.get_nowait()
            except queue.Empty:
                pass
            self._events.put_nowait(event)

    def _wait_for_pin_state(self, pin: int, expected_state: int, timeout: float = 0.1) -> None:
        deadline = monotonic() + timeout
        while GPIO.input(pin) != expected_state and monotonic() < deadline:
            sleep(0.001)

    def _rotation_interrupt(self, channel: int) -> None:
        sleep(0.002)
        switch_a = GPIO.input(channel)
        switch_b = GPIO.input(self.pin_b)

        if switch_a == 1 and switch_b == 0:
            self._emit(self.EVENT_RIGHT)
            self._wait_for_pin_state(self.pin_b, 1)
            self._wait_for_pin_state(self.pin_b, 0)
        elif switch_a == 1 and switch_b == 1:
            self._emit(self.EVENT_LEFT)
            self._wait_for_pin_state(self.pin_a, 0)

    def _button_interrupt(self, channel: int) -> None:
        sleep(0.01)
        if GPIO.input(channel) == 0:
            self._emit(self.EVENT_ACK)
            self._wait_for_pin_state(channel, 1, timeout=0.5)

    def _poll_loop(self) -> None:
        transition_delta = {
            0b0001: 1,
            0b0111: 1,
            0b1110: 1,
            0b1000: 1,
            0b0010: -1,
            0b1011: -1,
            0b1101: -1,
            0b0100: -1,
        }

        last_state = (GPIO.input(self.pin_a) << 1) | GPIO.input(self.pin_b)
        step_accumulator = 0
        last_button_state = GPIO.input(self.pin_button)

        while self._running:
            if not self._use_edge_detect:
                current_state = (GPIO.input(self.pin_a) << 1) | GPIO.input(self.pin_b)
                if current_state != last_state:
                    key = (last_state << 2) | current_state
                    delta = transition_delta.get(key, 0)

                    if delta:
                        step_accumulator += delta
                        if step_accumulator >= self.rotation_step:
                            self._emit(self.EVENT_RIGHT)
                            step_accumulator = 0
                        elif step_accumulator <= -self.rotation_step:
                            self._emit(self.EVENT_LEFT)
                            step_accumulator = 0
                    else:
                        step_accumulator = 0

                    last_state = current_state

            if not self._use_button_edge_detect:
                current_button_state = GPIO.input(self.pin_button)
                if last_button_state == 1 and current_button_state == 0:
                    self._button_interrupt(self.pin_button)
                last_button_state = current_button_state

            sleep(self.poll_interval)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    encoder = EncoderController()
    encoder.start()

    try:
        print("Encoder test running. Rotate or press button (CTRL+C to stop).")
        while True:
            event = encoder.read_event(timeout=0.5)
            if event:
                print(f"event: {event}")
    except KeyboardInterrupt:
        pass
    finally:
        encoder.stop()
