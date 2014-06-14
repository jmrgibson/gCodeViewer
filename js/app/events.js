/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 04/09/14
 * Time: 09:54 PM
 */
GCODE.events = (function () {
    'use strict';

    var Signal = signals.Signal;

    return {

        /** Used to exchange view events */
        view: {

            /**
             * Used to exchange 2d renderer specific view events.
             *
             * All handlers will receive a view name as first argument. If the view name is empty, the event was
             * dispatched in a globally (e.g. key press). The next arguments are usually the native events or required
             * parameters.
             */
            renderer2d: {
                /** native mouse down event */
                mouseDown: new Signal(),
                /** native mouse move event */
                mouseMove: new Signal(),
                /** native mouse up event */
                mouseUp: new Signal(),
                /** native scroll event */
                scroll: new Signal(),
                /** used to move one layer up, if possible */
                moveLayerUp: new Signal(),
                /** used to move one layer down, if possible */
                moveLayerDown: new Signal(),
                /** moves to specific layer, if possible */
                toLayer: new Signal(),
                /** adjusts all layers to same zoom and offset */
                adjust: new Signal(),
                /** takes a snapshot from the canvas */
                snapshot: new Signal(),
                /** event to crop all snapshots */
                cropSnapshot: new Signal(),
                /** event used to trigger the download of all snapshots */
                downloadSnapshots: new Signal()
            },

            /** Export XYZ file */
            exportXYZ: new Signal()
        },

        /** Used to change the current active view pane */
        navigation: {
            /** Event handler used to switch to 2d view */
            show2d: new Signal(),
            /** Event handler used to switch to 3d view */
            show3d: new Signal(),
            /** Event handler used to switch to GCode view */
            showGCode: new Signal()
        },

        /** gCode repository related events */
        repository: {
            /** Fires when a new gCode has been added. Will supply the name of the gCode as first argument */
            added: new Signal()
        },

        /** Used to interact with the GCODE worker. */
        process: {
            returnModel: new Signal(),
            analyzeDone: new Signal(),
            returnLayer: new Signal(),
            returnMultiLayer: new Signal(),
            analyzeProgress: new Signal(),
            toWorker: new Signal()
        }
    }
});