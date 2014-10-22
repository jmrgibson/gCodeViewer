import smbus
import argparse

AT8addr = 0x32
firstAddr = 0x00    #writeData = [int(d & 0xFF), int((d >> 8) & 0xFF)]


#example usage 
#python microcmds.py setenable 0 
#python microcmds.py setdrops 0 

def setDrops(d):
    d = int(d)
    writeData = []
    writeData.append(i2ccommand['drops'])
    writeData += [int(d & 0xFF), int((d >> 8) & 0xFF)]
    bus.write_i2c_block_data(AT8addr, firstAddr, writeData)
    
def setEnable(isEnabled):
    writeData = []
    writeData.append(i2ccommand['setenable'])
    if (isEnabled == 1) or (isEnabled == '1') or (isEnabled.lower() == 'true'):
        writeData.append(0xFF)
    else:
        writeData.append(0x00)
    bus.write_i2c_block_data(AT8addr, firstAddr, writeData)
    
def setMode(mode, period, duty, onhold = None):
    period = int(period)
    duty = int(duty)
    writeData = []
    writeData.append(i2ccommand[mode])
    writeData.append(int(period & 0xFF))
    writeData.append(int((period >> 8) & 0xFF))
    writeData.append(int(duty & 0xFF))
    writeData.append(int((duty >> 8) & 0xFF))
    if onhold != None:
        onhold = int(onhold)
        writeData.append(int(onhold & 0xFF))
        writeData.append(int((onhold >> 8) & 0xFF))
        
    bus.write_i2c_block_data(AT8addr, firstAddr, writeData)

def setSteps(inputfile):
    writeData = []
    startWrite = i2ccommand['preset1']
    writeData.append(startWrite)
    f = open(inputfile, 'r')
    data = f.readline()      
    steps = data.split(',')
    
    for step in steps:
        writeData.append(int(step))
        if len(writeData) == 26:
            bus.write_i2c_block_data(AT8addr, firstAddr, writeData)
            #print writeData
            writeData = [writeData[0]]
            writeData[0] += 1
		

# Define command line argument interface
parser = argparse.ArgumentParser(description='i2c interface for solenoid driver')
parser.add_argument('--mode', help='square preset holdpreset')
parser.add_argument('--period', help='time in ms between start of each drop')
parser.add_argument('--duty', help='on time for square, waveform time for preset modes')
parser.add_argument('--onhold', help='hold time in ms for presethold mode')
parser.add_argument('--drops', help='int, set a certain amount of drops if master and grbl control disabled')
parser.add_argument('--enabled', help='0/1, true/false: set master control to on/off.')
parser.add_argument('--waveformfile', help='name of waveform csv file to load')
           
i2ccommand = {'setenable'   : 2,
              'drops'       : 1,
              'square'      : 3,
              'custom'      : 4,
              'holdcustom'  : 6,
              'preset1'     : 7,
              'preset2'     : 8,
              'preset3'     : 9,
              'preset4'     : 10,
              'preset5'     : 11
              }          
           
args = parser.parse_args()           
bus = smbus.SMBus(1)           

if args.drops != None:
    setDrops(args.drops)
                
if args.mode != None:
    if args.mode == 'holdpreset':
        setMode(args.mode, args.period, args.duty, args.onhold)
    else:
        setMode(args.mode, args.period, args.duty)
        
if args.enabled != None:
    setEnable(args.enabled)

if args.waveformfile != None:
    setSteps(args.waveformfile)
