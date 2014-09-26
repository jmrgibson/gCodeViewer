# -*- coding: utf-8 -*-
"""
Created on Thu Sep 25 21:19:26 2014

@author: Joel Gibson
"""

if inputFile.lower().endswith(".dxf"):
    
    print "Processing .dxf file using PyCam..."

    pycamCall = ('python pycam --boundary-mode inside --export-gcode gcode.ngc '
                '--tool-shape cylindrical --tool-size {0} '
                '--process-path-strategy engrave --tool-feedrate {1} '
                '--tool-spindle-speed {2} --gcode-no-start-stop-spindle'
                '--process-overlap-percent 0 --process-milling-style ignore'
                '--safety-height 2 {3}').format(settings['traceWidth'], settings['feedRate'], settings['dropRate'], inputFile)

    subprocess.call(pycamCall, shell=True)
    
    print "postprocessing gcode"
    #call postprocessor!
    


if settings['usePostProcessor']:
    postProcessGcode()