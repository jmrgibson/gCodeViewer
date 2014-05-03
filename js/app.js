/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 03/30/14
 * Time: 5:54 PM
 */

var GCODE = {};

GCODE.app = (function () {

    /**
     * Handles all events of the GCODE app.
     *
     * @type {GCODE.events}
     */
    var events;

    /**
     * Holds the gCodeViewer UI logic
     *
     * @type {GCODE.ui}
     */
    var ui;

    /**
     * Holds all loaded GCodes.
     *
     * @type {GCODE.repository}
     */
    var repository;

    /**
     * Holds all loaded views.
     *
     * @type {GCODE.view[]}
     */
    var views = [];

    /**
     * Creates a full GCode viewer within the given DOM element. The DOM element has to be empty.
     *
     * @param {string} name the name to identify the viewer
     * @param domRoot the DOM root element
     */
    var createView = function (name, domRoot) {
        views[name] = new GCODE.view(domRoot);
    };

    /**
     * Removes the given view. The DOM element to which the view belonged to can safely be removed after calling this method.
     *
     * @param {string} name the name of the view
     */
    var removeView = function (name) {
        delete views[name];
    };

    /**
     * Displays the given error message to the user.
     *
     * @param {string} message the error message to display
     */
    var handleError = function (message) {
        console.log(message);
        ui.notify.error(message);
    }


    // ***** PUBLIC *******
    return {

        /**
         * Initializes the GCode Viewer application
         */
        init: function() {
            events = new GCODE.events();
            ui = new GCODE.ui(this, events);
            repository = new GCODE.repository();
            createView("default", $("#gcode"));
        },

        /**
         * Loads (and parses) the given GCode from the reader
         *
         * @param theFile The reader to read from, usually a FileReader
         */
        loadGCode: function (theFile) {
            var reader = new GCODE.reader(theFile, events);
            repository.save(reader);
        },

        /**
         * Returns the GCode repository
         *
         * @returns GCODE.repository
         */
        getRepository: function () {
            return repository;
        },

        /**
         * Displays the GCode with the given name in the view with the given name.
         *
         * @param {string} gCodeName
         * @param {string} viewerName
         */
        display: function (GCodeName, viewerName) {
            if (!(GCodeName in gcodes)) {
                handleError("GCode '" + GCodeName + "' is not loaded!");
                return;
            }
            if (!(viewerName in views)) {
                handleError("View '" + viewerName + "' is unknown!");
                return;
            }
            views[viewerName].load(gcodes[GCodeName]);
        }
    };

}());