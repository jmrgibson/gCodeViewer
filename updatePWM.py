import smbus
import argparse

AT8addr = 0x0F
pwmUpdate = 0x01

# Define command line argument interface
parser = argparse.ArgumentParser(description='Update ')
parser.add_argument('periodms', help='time between start of actuations in milliseconds')
parser.add_argument('dutyms', help='on time in milliseconds')
args = parser.parse_args()

p = round(float(args.periodms)/0.128) - 0.5
d = round(float(args.dutyms)/0.128) - 0.5
period = int(p) + (p>0)
duty = int(d) + (d>0)

bus = smbus.SMBus(1)

writeData = [int(period & 0xFF), int((period >> 8) & 0xFF), int(duty & 0xFF), int((duty >> 8) & 0xFF)]
bus.write_i2c_block_data(AT8addr, pwmUpdate, writeData)
