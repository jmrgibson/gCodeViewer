/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 05/04/14
 * Time: 12:27 PM
 */
GCODE.config = (function () {
    'use strict';

    /** Holds the actual config data and defines the default values */
    var data = {
        sortLayers: false,
        purgeEmptyLayers: true,
        analyzeModel: false,
        filamentType: "ABS",
        filamentDia: 1.75,
        nozzleDia: 0.4,
        showMoves: true,
        showRetracts: true,
        moveModel: true,
        differentiateColors: true,
        alpha: false,
        showNextLayer: false,
        actualWidth: false,
        renderAnalysis: false,
        speedDisplayType: 1,
        showGCode: true,
        synced: false
    };

    /**
     * Signal used to indicate that a config key has changed.
     *
     * @type {Signal}
     */
    var configChanged = new signals.Signal();

    /**
     * Creates a getter/setter class for a config member.
     *
     * @param {string} key
     * @param {function} filter the filter function
     * @returns {{get: Function, set: Function}}
     * @constructor
     */
    var Config = function (key, filter) {
        return {
            get: function () {
                return data[key];
            },
            set: function (val) {
                var value = {
                    old: this.get(),
                    new: val
                };
                if (filter == null || filter(value)) {
                    data[key] = value.new;
                    configChanged.dispatch(key, value.new, value.old);
                    return true;
                }
                return false;
            }
        }
    }

    /** Config filter for integer numbers */
    var integer = function (value) {
        var number = parseInt(value.new, 10);
        if (!isNaN(number)) {
            value.new = number;
            return true;
        }
        return false;
    };

    /** Config filter for decimal numbers */
    var decimal = function (value) {
        var number = parseFloat(value.new);
        if (!isNaN(number)) {
            value.new = number;
            return true;
        }
        return false;
    };

    /** Config filter for boolean values */
    var boolean = function (value) {
        if (value.new === true || value.new == 1 || value.new === "true") {
            value.new = true;
            return true;
        } else if (value.new === false || value.new == 0 || value.new === "false") {
            value.new = false;
            return true;
        }
        return false;
    }

    /** Used to filter for valid options */
    var options = function (options) {
        return function (value) {
            return _.contains(options, value.new);
        };
    };

    /** Chains filters together */
    var chain = function () {
        var filters = arguments;
        return function (value) {
            var valid = true;
            for (var filter = 0; filter < filters.length; filter++) {
                valid &= filters[filter](value);
                if (!valid) {
                    break;
                }
            }
            return valid;
        }
    }


    return {

        /**
         * Event fired if any config key changed.
         *
         * Event has three parameters: (configKey, newValue, oldValue)
         *
         * @var {signals.Signal}
         */
        configChangedEvent: configChanged,

        /**
         * Returns all options.
         *
         * @returns {Object}
         */
        getOptions: function () {
            var copy = {};
            for (var key in data) {
                copy[key] = data[key];
            }
            ;
            return copy;
        },

        /**
         * Sets a bunch of options.
         *
         * @param {Object} options
         */
        setOptions: function (options) {
            var valid = true;
            for (var key in options) {
                if (this[key] !== undefined && this[key]["set"] !== undefined) {
                    valid &= this[key].set(options[key]);
                }
            }
            return valid;
        },

        /** Sort layers by Z */
        sortLayers: new Config("sortLayers", boolean),

        /** Hide empty layers */
        purgeEmptyLayers: new Config("purgeEmptyLayers", boolean),

        /** Move model to the center of the grid */
        moveModel: new Config("moveModel", boolean),

        /** Show different speeds with different colors  */
        differentiateColors: new Config("differentiateColors", boolean),

        /** Render lines slightly transparent */
        alpha: new Config("alpha", boolean),

        /** Show +1 layer */
        showNextLayer: new Config("showNextLayer", boolean),

        /** Show non-extrusion moves  */
        showMoves: new Config("showMoves", boolean),

        /** Show retracts and restarts */
        showRetracts: new Config("showRetracts", boolean),

        /** Emulate extrusion width  */
        actualWidth: new Config("actualWidth", boolean),

        /** Plastic diameter */
        filamentDia: new Config("filamentDia", decimal),

        /** Nozzle size */
        nozzleDia: new Config("nozzleDia", decimal),

        /** Plastic type */
        filamentType: new Config("filamentType", options(["ABS", "PLA"])),

        /** Speed display type, 1: mm/sec, 2: mm extrusion per mm move, 3: mm^3/sec */
        speedDisplayType: new Config("speedDisplayType", chain(integer, options([1, 2, 3]))),

        /** Show GCode in CodeMirror tab */
        showGCode: new Config("showGCode", boolean),

        /** Whether or not to synchronize UI events between views */
        synced: new Config("synced", boolean),

        renderAnalysis: new Config("renderAnalysis", boolean)
    };
});