import math
import time

import w1thermsensor

class DS18B20Sensor:
	def __init__(self):
		self.sensor = w1thermsensor.W1ThermSensor()

	def get_temperature(self, retries: int = 5, delay: float = 0.25):
		"""Read temperature with retry for sensor warm-up."""
		if retries < 1:
			retries = 1
		if delay <= 0:
			delay = 0.25

		last_error = None
		for _ in range(retries):
			try:
				return math.ceil(self.sensor.get_temperature())
			except w1thermsensor.errors.SensorNotReadyError as error:
				last_error = error
				time.sleep(delay)

		if last_error is not None:
			raise last_error
		return math.ceil(self.sensor.get_temperature())


if __name__ == "__main__":
	sensor = DS18B20Sensor()
	print(sensor.get_temperature())