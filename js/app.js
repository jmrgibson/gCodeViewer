/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 03/30/14
 * Time: 5:54 PM
 */

GCODE.app = (function () {

    /**
     * Holds all loaded GCodes.
     *
     * @type GCODE.repository
     */
    var repository = new GCODE.repository();

    /**
     * Holds all loaded views.
     *
     * @type GCODE.view[]
     */
    var views = [];

    /**
     * Creates a full GCode viewer within the given DOM element. The DOM element has to be empty.
     *
     * @param name the name to identify the viewer
     * @param domRoot the DOM root element
     */
    var createView = function (name, domRoot) {

    };

    /**
     * Removes the given view. The DOM element to which the view belonged to can safely be removed after calling this method.
     *
     * @param name the name of the view
     */
    var removeView = function (name) {

    };

    /**
     * Displays the given error message to the user.
     *
     * @param message the error message to display
     */
    var handleError = function (message) {
        // TODO: display error message in a user friendly way
        console.log(message);
        alert(message);
    }


    // ***** PUBLIC *******
    return {

        /**
         * Loads (and parses) the given GCode from the reader
         *
         * @param theFile The reader to read from, usually a FileReader
         */
        loadGCode: function (theFile) {
            var reader = new GCODE.reader(theFile);
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