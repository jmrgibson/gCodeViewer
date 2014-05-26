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
        views[name] = new GCODE.view(name, domRoot, this);
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


    /**
     * Initializes the GCode Viewer application
     */
    this.init = function() {
        events = new GCODE.events();
        config = new GCODE.config();
        ui = new GCODE.ui(this, events);
        repository = new GCODE.repository(events);
        createView("view1", $("#view1"));
        createView("view2", $("#view2"));
        events.navigation.show2d.dispatch();
    };

    /**
     * Returns the gCode app config.
     *
     * @returns {GCODE.config}
     */
    this.getConfig = function() {
        return config;
    };

    /**
     * Loads (and parses) the given GCode from the reader
     *
     * @param {string} filename The filename of the file
     * @param {string} gCode The actual gCode
     */
    this.loadGCode = function (filename, gCode) {
        var reader = new GCODE.reader(filename, gCode, events, config, function() {
            repository.save(reader);
            for (var viewName in views) {
                if (!views[viewName].hasLoaded()) {
                    this.display(filename, viewName);
                    return;
                }
            }
        });
    };

    /**
     * Returns the GCode repository
     *
     * @returns {GCODE.repository}
     */
    this.getRepository = function () {
        return repository;
    };

    /**
     * Returns the names of all views.
     *
     * @returns {String[]}
     */
    this.getViews = function() {
        return Object.keys(views);
    };

    /**
     * Returns the view currently being hovered. If no view is hovered, returns null.
     *
     * @returns {GCODE.view}
     */
    this.getHoveredView = function () {
        for (var viewName in views) {
            var view = views[viewName];
            if (view.isHovered()) {
                return view;
            }
        }
        return null;
    };

    /**
     * Resizes all views.
     */
    this.resize = function() {
        _.values(views).forEach(function(view) {
            view.resize();
        });
    };

    /**
     * Returns the GCode app event manager.
     * @returns {GCODE.events}
     */
    this.getEventManager = function() {
        return events;
    };

    /**
     * Displays the GCode with the given name in the view with the given name.
     *
     * @param {string} gCodeName
     * @param {string} viewerName
     */
    this.display = function (gCodeName, viewerName) {
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
    };

    /**
     * Creates a view.
     *
     * @type {Function}
     */
    this.createView = createView;

    return this;
}());