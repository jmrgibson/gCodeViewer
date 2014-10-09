#!/usr/bin/env python


"""
This script parses the config file, postprocesses the gcode, and then streams it to the arduinos buffer
"""


import serial
import re
import time
import sys
import argparse
import subprocess
import ConfigParser

# Define command line argument interface
parser = argparse.ArgumentParser(description='sends a single gcode command to grbl')
parser.add_argument('command',
        help='input command')
args = parser.parse_args()

# Initialize
s = serial.Serial("dev/ttyAMA1", 9600)
f = args.gcode_file
verbose = True

# Wait for grbl to initialize and flush startup text in serial input
time.sleep(2)
s.flushInput()

# Stream g-code to grbl
print "Streaming gcode.ngc to ", args.device_file
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
            print "  Debug: ",out_temp # Debug response
        else :
            grbl_out += out_temp;
            g_count += 1 # Iterate g-code counter
            grbl_out += str(g_count); # Add line finished indicator
            del c_line[0]
    if verbose: print "SND: " + str(l_count) + " : " + l_block,
    s.write(l_block + '\n') # Send block to grbl
    if verbose : print "BUF:",str(sum(c_line)),"REC:",grbl_out

# Wait for user input after streaming is completed
print "G-code streaming finished! Printer will continue operations until finished\n"
#print "WARNING: Wait until grbl completes buffered g-code blocks before exiting."
#raw_input("  Press <Enter> to exit and disable grbl.")  

# Close file and serial port
f.close()
s.close()
