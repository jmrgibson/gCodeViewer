#!/usr/bin/env python
"""
Created on Thu Aug 14 21:41:51 2014

@author: Joel Gibson
"""

import serial
import re
import time
import json
import argparse
# import threading
import subprocess
import ConfigParser
import os

settings = {}

<<<<<<< HEAD
def shellunstringify(strIn):
    output = {};
    pairs = strIn.split("_");
    for pair in pairs:
        nameval = pair.split("-")
        output[nameval[0]] = nameval[1]
    
    return output
=======
def pauseGrbl():
    #get current state of spindle
    sendGcode('M5')
    sendGcode('!')
    
    
def stopGrbl():
    sendGcode('ctrl-x')
    
def resumeGrbl():
    sendGcode('M3')
    sendGcode('?')
    
>>>>>>> origin/master

def sendReply(evt, val):
    print (evt+":"+val)
    

def readSettings():
    config = ConfigParser.RawConfigParser()
    config.read('config.ini')
    for section in config.sections():
        for option in config.options(section):
            settings[option] = config.get(section, option)
            
def writeSettings():
    f = open('config.ini', 'r+')
    f.truncate()
    f.write('[PrintSettings]\n')
    for setting in settings:
        f.write(setting + " = " + settings[setting] + '\n')
    
def setSettings(settingsIn):
    #settings = json.loads(settingsIn)
    pairs = settingsIn.split("_");
    for pair in pairs:
        nameval = pair.split("-")
        settings[nameval[0]] = nameval[1]
    writeSettings()
    sendReply("settingsWrote", "None")

def getSettings(val):
    readSettings()
    
    strout = ""
    for setting in settings:
        strout += setting + "-" + settings[setting] + "_"
        
    strout = strout[0:-1] #takes off last _
    sendReply("updateSettings", strout)
    
    return None
        

def jog(jogcmd):
    #comes in as Xp3d
    jogstep = jogcmd[2]            
    
    jogsteps = {'3': 10,
                '2': 1,
                '1': 0.1
                }            
          
    if jogcmd[1] == 'p':
        sign = ' '
    else:
        sign = '-'   
        
    outputCmd = "G1 " + jogcmd[0] + sign + str(jogsteps[jogstep])
    
    dropWhileJog = False
    if len(jogcmd) == 4:
        if jogcmd[-1] == 'd':
            dropWhileJog = True
    
    #return 'gotjog: ' + outputCmd + str(dropWhileJog) #works fine
        
    if dropWhileJog:
        sendGcode("M4")
    sendGcode("G91")    #make sure to turn on-off rel positioning
    out = sendGcode(outputCmd)
    sendGcode("G90")
    if dropWhileJog:
        sendGcode("M3")
        sendGcode("M5")

    return out

def sendGcode(sendline):
    #return "sent Gcode" #got here
    #sendline = json.loads(sendline)
    #return 'line: ' + sendline    #got here
    #return 'I am: ' + subprocess.call('whoammi')
    
    #requestSerial()
    try:
    
        s = serial.Serial("/dev/ttyAMA0", 9600, timeout=2)
        sendline = sendline.strip()
        
        s.flushOutput()
        s.flushInput()
        
        s.write(sendline + '\n')
        return s.readline()
    except:
        return 'Error encountered!'
    
    finally:
        s.close()
        #releaseSerial()        

    #s.write(sendline + '\n')
    
    return 'done'

def releaseSerial():
    os.remove("SERIALINUSE.txt")

def requestSerial():    
    while (os.path.isfile("SERIALINUSE.txt")):
        continue
    serialSemaphore = open("SERIALINUSE.txt", 'w+')
    serialSemaphore.close()
    

"""
This script parses the config file, postprocesses the gcode, and then streams it to the arduinos buffer
"""


def streamGcodeFile(inputFile):
    replyack = ''
    
    #readSettings()
    #subprocess.call(['python', 'updatePwm.py', settings['dropperiod'], settings['dropduty']])

    
    RX_BUFFER_SIZE = 128
    
     #check if gcode or dxf parsed in

            
                
    # Initialize
    s = serial.Serial("/dev/ttyAMA0", 9600, timeout=2)
    f = inputFile
    verbose = False
        
    # Wake up grbl
    #print "Initializing grbl..."
    s.write("\r\n\r\n")
    
    # Wait for grbl to initialize and flush startup text in serial input
    time.sleep(2)
    s.flushInput()
    
    # Stream g-code to grbl
    #was a print here
    l_count = 0
    g_count = 0
    c_line = []
    # periodic() # Start status report periodic timer
    for line in f:
        l_count += 1 # Iterate line counter
    #     l_block = re.sub('\s|\(.*?\)','',line).upper() # Strip comments/spaces/new line and capitalize
        l_block = line.strip()
        c_line.append(len(l_block)+1) # Track number of characters in grbl serial read buffer
        grbl_out = '' 
        while sum(c_line) >= RX_BUFFER_SIZE-1 | s.inWaiting() :
            out_temp = s.readline().strip() # Wait for grbl response
            if out_temp.find('Grbl'):
                return 'Gcode streaming interrupted'
            if out_temp.find('ok') < 0 and out_temp.find('error') < 0 :
                #print "  Debug: ",out_temp # Debug response
                notused = 'hi'
            else :
                grbl_out += out_temp;
                g_count += 1 # Iterate g-code counter
                grbl_out += str(g_count); # Add line finished indicator
                del c_line[0]
        if verbose: print "SND: " + str(l_count) + " : " + l_block,
        s.write(l_block + '\n') # Send block to grbl
        if verbose : print "BUF:",str(sum(c_line)),"REC:",grbl_out
    
    # Wait for user input after streaming is completed
    return "G-code streaming finished! Printer will continue operations until finished"
    #print "WARNING: Wait until grbl completes buffered g-code blocks before exiting."
    #raw_input("  Press <Enter> to exit and disable grbl.")  
    
    # Close file and serial port
    f.close()
    s.close()

def postProcessGcode():
    
    keepZAxisMovement = False
    
    #must use M4 as the direction pin is used to assert grbl control
    os.rename('gcode.ngc', 'gcode_old.ngc')
    oldgcode = open("gcode_old.ngc" ,'r')
    newgcode = open("gcode.ngc", 'w+')  #w+ creates if not existing
    newgcode.truncate(0);  #clears file
    

    #used to assert grbl control of printer
    newgcode.write("M4\n")
    newgcode.write("M5\n")

    for line in oldgcode:
        if "Z" in line:
            if keepZAxisMovement: #if we are keeping the z commands
                newgcode.write(line)
            ans = re.search("[+-]?[\d]*\.[\d]*", line)   #gets floating point numbers
            try:
                if float(ans.group(0)) > 0:    #if going up
                    newgcode.write("M5\n") #spindle off
                else:
                    newgcode.write("M4\n") #spindle on
                    
            except ValueError:
                print "error converting '{0}'".format(ans)
        else:
            newgcode.write(line)

    #unasserts grbl control
    newgcode.write("M3\n")        
    newgcode.write("M5\n")
            
    oldgcode.close()
    newgcode.close()        

def updatePWM(inputVals):
    #return 'pwmupdated'
    mode = ' --mode='
    period = ' --period='
    duty = ' --duty='
    hold = ' --hold='
    
    settings = shellunstringify(inputVals)
        
    mode += settings['mode']
    period += settings['period']
    duty += settings['duty']
    
    outVals = mode + period + duty
    
    if settings['mode'] == 'holdcustom':
        outVals += (hold + settings['hold'])
    
    return 'python microcmds.py ' + outVals
    subprocess.call('python microcmds.py ' + outVals)
    return 'Settings Updated.'
    
def setDrops(inputVals):
    return str(inputVals) + ' drops set'    
    subprocess.call('python microcmds.py --drops=' + inputVals)

    
def updateWaveform(inputVals):
    subprocess.call('python microcmds.py --setSteps=' + inputVals)
    
def printFile(inputVals):
    #readSettings()
    #pycam call if dxf uploaded
    #postProcessGcode()
    streamGcodeFile(inputVals)
    
def test(inval):
    print 'test ok: ' + inval
    
def grblHome(blah):
    sendGcode('$H')
    return sendGcode('G10')


events = {'jog': jog,             #xp1
          'printFile': printFile,         #name
          'updatePWM': updatePWM,    #solenoid_100_50 (period duty)
          'setDrops': setDrops,
          'sendGcode': sendGcode,         #grbl_command^number
          'setSettings': setSettings,     #setsettings_feedrate-blah_droprate-blah
          'getSettings': getSettings,
          'updateWaveform': updateWaveform,
          'homecycle': grblHome,
          'test': test}
          

# Define command line argument interface
parser = argparse.ArgumentParser(description='processes events sent from the webserver, and handles the rest of the execution')
parser.add_argument('evt',
                    help='input event (for example, "jog" or "setSettings"')
parser.add_argument('val',
                    help='value of stuff')
args = parser.parse_args()

#events come in as arg1 = event arg2 = variables

#print args.evt
#print args.val

print events[args.evt](args.val).strip()
    
    