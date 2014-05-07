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
     * Holds gCode app related configuration
     *
     * @type {GCODE.config}
     */
    var config;

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
    var views = {};

    /**
     * Creates a full GCode viewer within the given DOM element. The DOM element has to be empty.
     *
     * @param {string} name the name to identify the viewer
     * @param domRoot the DOM root element
     */
    var createView = function (name, domRoot) {
        views[name] = new GCODE.view(name, domRoot, config, events);
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
            config = new GCODE.config();
            ui = new GCODE.ui(this, events);
            repository = new GCODE.repository();
            createView("view1", $("#view1"));
            createView("view2", $("#view2"));
        },

        /**
         * Returns the gCode app config.
         *
         * @returns {GCODE.config}
         */
        getConfig: function() {
            return config;
        },

        /**
         * Loads (and parses) the given GCode from the reader
         *
         * @param {string} filename The filename of the file
         * @param {string} gCode The actual gCode
         */
        loadGCode: function (filename, gCode) {
            var that = this;
            var reader = new GCODE.reader(filename, gCode, events, config, function() {
                repository.save(reader);
                that.display(filename, "view1");
            });
        },

        /**
         * Returns the GCode repository
         *
         * @returns {GCODE.repository}
         */
        getRepository: function () {
            return repository;
        },

        /**
         * Returns the names of all views.
         *
         * @returns {String[]}
         */
        getViews: function() {
            return Object.keys(views);
        },

        /**
         * Returns the GCode app event manager.
         * @returns {GCODE.events}
         */
        getEventManager: function() {
            return events;
        },

        /**
         * Displays the GCode with the given name in the view with the given name.
         *
         * @param {string} gCodeName
         * @param {string} viewerName
         */
        display: function (gCodeName, viewerName) {
            var reader = repository.find(gCodeName);
            if (null == reader) {
                handleError("GCode '" + gCodeName + "' is not loaded!");
                return;
            }
            if (undefined == views[viewerName]) {
                handleError("View '" + viewerName + "' is unknown!");
                return;
            }
            views[viewerName].load(reader);
        }
    };

}());