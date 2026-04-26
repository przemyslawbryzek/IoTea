import w1thermsensor
import math

class DS18B20Sensor:
	def __init__(self):
		self.sensor = w1thermsensor.W1ThermSensor()

	def get_temperature(self):
		return math.ceil(self.sensor.get_temperature())


if __name__ == "__main__":
	sensor = DS18B20Sensor()
	print(sensor.get_temperature())