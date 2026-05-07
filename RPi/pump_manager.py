import atexit
import logging
import time
import warnings


logger = logging.getLogger(__name__)


try:
	import RPi.GPIO as GPIO  # type: ignore[import-not-found]
	_GPIO_AVAILABLE = True
except ImportError:  # pragma: no cover - allows local dev without RPi GPIO
	_GPIO_AVAILABLE = False

	class _MockGPIO:
		BCM = "BCM"
		OUT = "OUT"
		HIGH = 1
		LOW = 0

		@staticmethod
		def setmode(mode):
			logger.warning("MockGPIO setmode(%s)", mode)

		@staticmethod
		def setup(pin, mode, initial=0):
			logger.warning("MockGPIO setup(pin=%s, mode=%s, initial=%s)", pin, mode, initial)

		@staticmethod
		def output(pin, state):
			logger.info("MockGPIO output(pin=%s, state=%s)", pin, state)

		@staticmethod
		def cleanup(pin=None):
			logger.info("MockGPIO cleanup(pin=%s)", pin)

	GPIO = _MockGPIO()


class PumpManager:
	"""Simple ON/OFF pump controller for relay on GPIO 13 (BCM numbering)."""

	def __init__(self, pin: int = 13, active_high: bool = True, flow_lpm: float = 1.75):
		self.pin = pin
		self.active_high = active_high
		self.flow_lpm = flow_lpm
		self._is_on = False
		self._cleaned = False
		self._atexit_registered = False

		GPIO.setmode(GPIO.BCM)
		off_state = GPIO.LOW if self.active_high else GPIO.HIGH
		GPIO.setup(self.pin, GPIO.OUT, initial=off_state)

		atexit.register(self.cleanup)
		self._atexit_registered = True
		logger.info(
			"PumpManager initialized on GPIO%s (mode=BCM, active_high=%s, flow_lpm=%.2f, gpio_available=%s)",
			self.pin,
			self.active_high,
			self.flow_lpm,
			_GPIO_AVAILABLE,
		)

	def on(self):
		"""Turn pump ON."""
		state = GPIO.HIGH if self.active_high else GPIO.LOW
		GPIO.output(self.pin, state)
		self._is_on = True
		logger.info("Pump ON (GPIO%s)", self.pin)

	def off(self):
		"""Turn pump OFF."""
		if self._cleaned:
			return

		state = GPIO.LOW if self.active_high else GPIO.HIGH
		GPIO.output(self.pin, state)
		self._is_on = False
		logger.info("Pump OFF (GPIO%s)", self.pin)

	def pump_ml(self, volume_ml: float):
		"""Run pump long enough to dispense a target volume."""
		if volume_ml <= 0:
			raise ValueError("volume_ml must be > 0")
		if self.flow_lpm <= 0:
			raise ValueError("flow_lpm must be > 0")

		ml_per_second = (self.flow_lpm * 1000.0) / 60.0
		seconds = volume_ml / ml_per_second
		logger.info("Pumping %.1fml (flow=%.2f lpm, time=%.2fs)", volume_ml, self.flow_lpm, seconds)

		self.on()
		try:
			time.sleep(seconds)
		finally:
			self.off()

		return seconds

	def is_on(self) -> bool:
		return self._is_on

	def cleanup(self):
		"""Safe shutdown: force OFF and cleanup selected GPIO pin."""
		if self._cleaned:
			return

		if self._atexit_registered:
			try:
				atexit.unregister(self.cleanup)
			except Exception:
				pass
			finally:
				self._atexit_registered = False

		try:
			try:
				self.off()
			except RuntimeError:
				pass
		finally:
			with warnings.catch_warnings():
				warnings.filterwarnings("ignore", message="No channels have been set up yet.*")
				GPIO.cleanup(self.pin)
			self._cleaned = True
			logger.info("Pump GPIO cleaned up (GPIO%s)", self.pin)


if __name__ == "__main__":
	logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

	pump = PumpManager(pin=13, active_high=True, flow_lpm=1.75)
	try:
		target_ml = 250.0
		logger.info("Demo: pumping %.1fml", target_ml)
		pump.pump_ml(target_ml)
	finally:
		pump.cleanup()
