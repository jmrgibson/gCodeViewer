import smbus
import argparse

AT8addr = 0x0F
dropUpdate = 0x02

# Define command line argument interface
parser = argparse.ArgumentParser(description='Tells the solenoid driver to do a certain amount of drops')
parser.add_argument('drops', help='number of drops')
args = parser.parse_args()
d = int(args.drops)

bus = smbus.SMBus(1)
writeData = [int(d & 0xFF), int((d >> 8) & 0xFF)]
bus.write_i2c_block_data(AT8addr, dropUpdate, writeData)
