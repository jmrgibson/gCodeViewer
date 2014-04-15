/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 04/09/14
 * Time: 09:54 PM
 */
GCODE.events = (function () {
    'use strict';

    var Signal = signals.Signal;

    return {
        /** Used to move one layer up in the 2D viewer */
        moveLayerUp: new Signal(),

        /** Used to move one layer down in the 2D viewer */
        moveLayerDown: new Signal(),

        /** Used to change the current active view pane */
        changePane: new Signal(),

        /** Used to interact with the GCODE worker. */
        process: {
            returnModel: new Signal(),
            analyzeDone: new Signal(),
            returnLayer: new Signal(),
            returnMultiLayer: new Signal(),
            analyzeProgress: new Signal()
        }
    }
});