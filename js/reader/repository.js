/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 04/06/14
 * Time: 08:32 PM
 */
GCODE.repository = (function () {
    "use strict";

    /**
     * Holds the gcodes
     * @type {GCODE.reader}
     */
    var gcodes = [];

    // ***** PUBLIC *******
    return {

        /**
         * Saves a read GCode to the repository.
         *
         * @param {GCODE.reader} reader The reader to put into the repository
         */
        save: function (reader) {
            gcodes[reader.getName()] = reader;
        },

        /**
         * Finds a single GCode file in the repository. Returns null if no GCode with the given name exists.
         *
         * @param {string} name The name of the GCode file
         * @returns {GCODE.reader} reader
         */
        find: function (name) {
            if (gcodes[name] === undefined) {
                return null;
            }
            return gcodes[name];
        },

        /**
         * Returns a list of all stored GCode names
         *
         * @returns {string[]}
         */
        list: function () {
            return Object.keys(gcodes);
        }
    }
});