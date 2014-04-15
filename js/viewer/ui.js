/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */

GCODE.ui = (function (eventManager) {

    /**
     * GCode event manager
     * @type {GCODE.events}
     */
    var events = eventManager;

    /**
     * Checks whether the current browser supports all technical requirements to display the GCode viewer
     *
     * @returns {boolean} True if all requirements are met.
     */
    var checkCapabilities = function () {
        var fatal = [];
        Modernizr.addTest('filereader', function () {
            return !!(window.File && window.FileList && window.FileReader);
        });
        if (!Modernizr.canvas) {
            fatal.push("Your browser doesn't seem to support HTML5 Canvas, this application won't work without it.");
        }
        if (!Modernizr.filereader) {
            fatal.push("Your browser doesn't seem to support HTML5 File API, this application won't work without it.");
        }
        if (!Modernizr.webworkers) {
            fatal.push("Your browser doesn't seem to support HTML5 Web Workers, this application won't work without it.");
        }
        if (!Modernizr.svg) {
            fatal.push("Your browser doesn't seem to support HTML5 SVG, this application won't work without it.");
        }
        if (fatal.length > 0) {
            console.log("Initialization failed: unsupported browser.");
            throw {
                name: "Unsupported Browser",
                message: fatal
            };
        }

        var warnings = [];
        if (!Modernizr.webgl) {
            warnings.push("Your browser doesn't seem to support HTML5 Web GL, 3d mode is not recommended, going to be SLOW!");
            GCODE.renderer3d.setOption({rendererType: "canvas"});
        }
        if (!Modernizr.draganddrop){
            warnings.push("Your browser doesn't seem to support HTML5 Drag'n'Drop, Drop area will not work.");
        }
        if (warnings.length > 0) {
            // TODO: improve
            console.log("Initialization succeeded with warnings.")
            return warnings;
        }
        return true;
    };

    return {
        init: function () {

        }
    };
});