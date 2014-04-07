/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 03/30/14
 * Time: 5:54 PM
 */
GCODE.view = (function (domRoot) {

    /**
     * Holds the DOM root node of the view
     * @type {*}
     */
    var root = domRoot;

    /**
     * Holds the GCode to be displayed in this view.
     * @type {GCODE.reader}
     */
    var gcode = null;

    /**
     * Initializes the view and makes sure everything is ready.
     */
    var init = function () {

    }


    init();
    return {
        /**
         * Opens the 2D layer view in this view
         */
        "display2d": function () {
        },

        /**
         * Opens the 3D model in this view
         */
        "display3d": function () {
        },

        /**
         * Opens the GCode source in this view
         */
        "displaySource": function () {
        },

        /**
         * Loads a GCode into this view
         *
         * @param {GCODE.reader} reader
         */
        "load": function (reader) {
            gcode = reader;
        }
    }
});