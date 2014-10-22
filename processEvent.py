#!/usr/bin/env python
"""
Created on Thu Aug 14 21:41:51 2014

@author: Joel Gibson
"""

import serial
import re
import time
import argparse
import collections
import math
import subprocess
import ConfigParser
import os

class GcodeShape:
    def __init__(self, l, w):
        self.lines = l
        self.wanted = w

settings = {}

def shellunstringify(strIn):
    output = {};
    pairs = strIn.split("_");
    for pair in pairs:
        nameval = pair.split("-")
        output[nameval[0]] = nameval[1]
    
    return output

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
    

    sendGcode("G91")    #make sure to turn on-off rel positioning    
    if dropWhileJog:
        sendGcode("M4")    
    out = sendGcode(outputCmd)
    if dropWhileJog:
        sendGcode("M3")
        sendGcode("M5")
        
    sendGcode("G90")

    return out

def sendGcode(sendline):
    #return "sent Gcode" #got here
    #sendline = json.loads(sendline)
    #return 'line: ' + sendline    #got here
    #return 'I am: ' + subprocess.call('whoammi')

    
    sendline = sendline.replace('_', ' ')
#    return sendline
    
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
    if inputFile.lower().endswith(".dxf"):
    
        print "Processing .dxf file using PyCam..."
    
        pycamCall = ('python pycam --boundary-mode inside --export-gcode gcode.ngc '
                    '--tool-shape cylindrical --tool-size {0} '
                    '--process-path-strategy engrave --tool-feedrate {1} '
                    '--tool-spindle-speed {2} --gcode-no-start-stop-spindle'
                    '--process-overlap-percent 0 --process-milling-style ignore'
                    '--safety-height 2 {3}').format(settings['traceWidth'], settings['feedRate'], settings['dropRate'], inputFile)
    
        subprocess.call(pycamCall, shell=True)

        
    settingsFile = open('config.ini', 'r')    
    a = settingsFile.readline()
    settingsFile.close()
    if a == 'true':
        postProcessGcode()
    
    
    sendGcode('G92_X0_Y0_Z0')
            
                
    # Initialize
    s = serial.Serial("/dev/ttyAMA0", 9600, timeout=2)
    f = open(inputFile, 'r')
    verbose = False
        
    # Wake up grbl
    #print "Initializing grbl..."
    s.write("\r\n\r\n")

    
    # Wait for grbl to initialize and flush startup text in serial input
    time.sleep(2)
    s.flushInput()
    
    
    #s.write("G92 X0 Y0 Z0\n")
    #s.readline().strip()
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
    
    #print "WARNING: Wait until grbl completes buffered g-code blocks before exiting."
    #raw_input("  Press <Enter> to exit and disable grbl.")  
    
    # Close file and serial port
    f.close()
    s.close()
    
    return "G-code streaming finished! Printer will continue operations until finished"

def postProcessGcode():
    
    #must use M4 as the direction pin is used to assert grbl control
    os.rename('printjob.gcode', 'printjob_old.gcode')
    oldgcode = open("printjob_old.gcode" ,'r')
    newgcode = open("printjob.gcode", 'w+')  #w+ creates if not existing
    newgcode.truncate(0);  #clears file
    

    newgcode.write("G90\n")
    newgcode.write("F80\n")

    newgcode.write("M4\n")
    newgcode.write("M5\n")
    
    currentShape = -1 #-1 is preable
    shapes = collections.OrderedDict()
    shapes[currentShape] = GcodeShape(list(), False)
    
    for line in oldgcode:
        re_shape = re.search('SHAPE Nr: \d*', line)
        g3 = re.search('G3', line)
        g2 = re.search('G2', line)
        m3 = re.search('M3', line)
        m4 = re.search('M4', line)
        m5 = re.search('M5', line)
        f = re.search('F\d*', line)
        zp = re.search('Z\d*', line)
        i = re.search('[I]\s*[+-]?\d*.\d*', line)
        j = re.search('[J]\s*[+-]?\d*.\d*', line)
        
        if f or m3 or m4 or m5:
            continue
                        
        #if new shape detected
        if re_shape:
            currentShape = re_shape.group()[10:]
            shapes[currentShape] = GcodeShape(list(), True)
            shapes[currentShape].lines.append('(* ' + re_shape.group() + ' *)\n')
        else:   #otherwise normal line
            shapes[currentShape].lines.append(line)
            if (g3 or g2) and i and j:  #check if contains little circle bits 
                ival = float(i.group().strip())
                jval = float(j.group().strip())
                #remove all characters and whitespace to get number
                if math.sqrt(ival ** 2 + jval ** 2) < 0.1:
                    shapes[currentShape].wanted = False
                    
            



   
    for shape in shapes:
        if shapes[shape].wanted == False:
            continue
        else:
            for line in shapes[shape].lines:
                down = re.search('Z\s*[0]', line)
                up = re.search('Z\s*[1-9]', line)
                if down:
                    newgcode.write('M4\n')
                    #continue
                if up:
                    newgcode.write('M3\n')
                    #continue
                newgcode.write(line)
    
    newgcode.write("M3\n")        
    newgcode.write("M5\n")
            
    oldgcode.close()
    newgcode.close()        

def updatePWM(inputVals):
    #return 'pwmupdated'
    mode    = ' --mode='
    period  = ' --period='
    duty    = ' --duty='
    hold    = ' --hold='
    
    settings = shellunstringify(inputVals)
    
    mode += settings['mode']
    period += settings['period']
    duty += settings['duty']
    
    outVals = mode + period + duty
    
    if settings['mode'] == 'holdcustom':
        outVals += (hold + settings['hold'])
    
    #return 'python microcmds.py ' + outVals
    subprocess.call('python microcmds.py ' + outVals, shell = True)
    return 'Settings Updated.'
    
def setDrops(inputVals):
    outcmd = 'python microcmds.py --drops=' + inputVals
    #return outcmd
    subprocess.call(outcmd, shell = True)
    return str(inputVals) + ' drops set'    
    

    
def updateWaveform(inputVals):
    subprocess.call('python microcmds.py --setSteps=' + inputVals, shell = True)
    
def startGrbl(inputVals):
    #readSettings()
    #pycam call if dxf uploaded
    #postProcessGcode()
    return streamGcodeFile(inputVals)
    
def postProc(val):
    if val == 'true':
        v = 'true'
        s = ''
    elif val == 'false':
        v = 'false'
        s ='not '
        
    f = open('config.ini', 'r+')
    f.truncate()
    f.write(v + '\n')
    
    f.close()
        
    return 'printer is {0}using onboard gcode post-processor'.format(s)
    
def pauseGrbl(a):
    #get and save current spindle state?
    sendGcode('!') #feed hold command
    
def resumeGrbl(a):
    #write previous spindle state
    sendGcode('~')

def stopGrbl(a):
    sendGcode('^x')
    
def test(inval):
    return 'test ok: ' + inval


events = {'jog': jog,             #xp1
          'startGrbl': startGrbl,         #name
          'updatePWM': updatePWM,    #solenoid_100_50 (period duty)
          'setDrops': setDrops,
          'sendGcode': sendGcode,         #grbl_command^number
          'setSettings': setSettings,     #setsettings_feedrate-blah_droprate-blah
          'getSettings': getSettings,
          'updateWaveform': updateWaveform,
          'pauseGrbl': pauseGrbl,
          'stopGrbl': stopGrbl,
          'resumeGrbl': resumeGrbl,
          'postProc': postProc,
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
    
    