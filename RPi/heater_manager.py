import atexit
import logging
import time
import warnings

from DS18B20 import DS18B20Sensor


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


class HeaterManager:
	"""Simple ON/OFF heater controller for relay on GPIO 12 (BCM numbering)."""

	def __init__(self, pin: int = 12, active_high: bool = True):
		self.pin = pin
		self.active_high = active_high
		self._is_on = False
		self._cleaned = False
		self._atexit_registered = False

		GPIO.setmode(GPIO.BCM)
		off_state = GPIO.LOW if self.active_high else GPIO.HIGH
		GPIO.setup(self.pin, GPIO.OUT, initial=off_state)

		atexit.register(self.cleanup)
		self._atexit_registered = True
		logger.info(
			"HeaterManager initialized on GPIO%s (mode=BCM, active_high=%s, gpio_available=%s)",
			self.pin,
			self.active_high,
			_GPIO_AVAILABLE,
		)

	def on(self):
		"""Turn heater ON."""
		state = GPIO.HIGH if self.active_high else GPIO.LOW
		GPIO.output(self.pin, state)
		self._is_on = True
		logger.info("Heater ON (GPIO%s)", self.pin)

	def off(self):
		"""Turn heater OFF."""
		if self._cleaned:
			return

		state = GPIO.LOW if self.active_high else GPIO.HIGH
		GPIO.output(self.pin, state)
		self._is_on = False
		logger.info("Heater OFF (GPIO%s)", self.pin)

	def pulse(self, seconds: float):
		"""Turn heater ON for selected time and then OFF."""
		if seconds <= 0:
			raise ValueError("seconds must be > 0")

		self.on()
		try:
			time.sleep(seconds)
		finally:
			self.off()

	def is_on(self) -> bool:
		return self._is_on

	def heat_to_temperature(
		self,
		target_celsius: float,
		sensor: DS18B20Sensor,
		tolerance_celsius: float = 0.5,
		max_seconds: float = 1200,
		poll_interval: float = 1.0,
	):
		"""Heat until the sensor reaches target temperature (simple ON/OFF control)."""
		if target_celsius <= 0:
			raise ValueError("target_celsius must be > 0")
		if tolerance_celsius < 0:
			raise ValueError("tolerance_celsius must be >= 0")
		if max_seconds <= 0:
			raise ValueError("max_seconds must be > 0")
		if poll_interval <= 0:
			raise ValueError("poll_interval must be > 0")

		start_time = time.time()
		last_temp = None

		self.on()
		try:
			while True:
				elapsed = time.time() - start_time
				if elapsed >= max_seconds:
					raise TimeoutError(
						f"Max heating time exceeded ({max_seconds}s) before reaching target"
					)

				try:
					last_temp = sensor.get_temperature()
				except Exception as error:
					logger.warning("Temperature read failed: %s", error)
					time.sleep(poll_interval)
					continue

				logger.info("Heating... current=%.2fC target=%.2fC", last_temp, target_celsius)
				if last_temp >= target_celsius - tolerance_celsius:
					break
				time.sleep(poll_interval)
		finally:
			self.off()

		return last_temp

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
				# If GPIO output is already unavailable, continue with cleanup.
				pass
		finally:
			with warnings.catch_warnings():
				warnings.filterwarnings("ignore", message="No channels have been set up yet.*")
				GPIO.cleanup(self.pin)
			self._cleaned = True
			logger.info("Heater GPIO cleaned up (GPIO%s)", self.pin)


if __name__ == "__main__":
	logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

	sensor = None
	try:
		sensor = DS18B20Sensor()
		temperature = sensor.get_temperature()
		logger.info("DS18B20 temperature before heating: %s°C", temperature)
	except Exception as error:
		logger.warning("Cannot read DS18B20 before heating: %s", error)

	heater = HeaterManager(pin=12, active_high=True)
	try:
		if sensor is None:
			raise RuntimeError("No temperature sensor available")

		target_temperature = 85.0
		logger.info("Demo: heating to %.1fC", target_temperature)
		final_temp = heater.heat_to_temperature(
			target_celsius=target_temperature,
			sensor=sensor,
			tolerance_celsius=0.5,
			max_seconds=1200,
			poll_interval=1.0,
		)
		logger.info("Target reached, final temperature: %.2fC", final_temp)

		if sensor is not None:
			try:
				temperature = sensor.get_temperature()
				logger.info("DS18B20 temperature after heating: %s°C", temperature)
			except Exception as error:
				logger.warning("Cannot read DS18B20 after heating: %s", error)
	finally:
		heater.cleanup()
