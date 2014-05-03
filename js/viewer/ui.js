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
     * Contains a set of notification helpers.
     */
    var notify = {
        _notify: function (message, title, severity, sticky) {
            var msg;
            if (title == null) {
                msg = message;
            } else {
                msg = {
                    title: title,
                    message: message
                }
            }
            $.growl(msg, {
                type: severity,
                position: { from: "bottom", align: "right" },
                delay: (sticky != null && sticky) ? 0 : 5000
            });
        },
        info: function (message, title, sticky) {
            this._notify(message, title, "info", sticky);
        },
        warning: function (message, title, sticky) {
            this._notify(message, title, "warning", sticky);
        },
        error: function (message, title, sticky) {
            this._notify(message, title, "danger", sticky);
        },
        success: function (message, title, sticky) {
            this._notify(message, title, "success", sticky);
        }
    }

    /**
     * Checks whether the current browser supports all technical requirements to display the GCode viewer
     *
     * @returns {boolean} True if all requirements are met.
     */
    var checkCapabilities = function () {
        var fail = false;
        Modernizr.addTest('filereader', function () {
            return !!(window.File && window.FileList && window.FileReader);
        });
        if (!Modernizr.canvas) {
            notify.error("Your browser doesn't seem to support HTML5 Canvas, this application won't work without it.", "Initialization error", true);
            fail = true;
        }
        if (!Modernizr.filereader) {
            notify.error("Your browser doesn't seem to support HTML5 File API, this application won't work without it.", "Initialization error", true);
            fail = true;
        }
        if (!Modernizr.webworkers) {
            notify.error("Your browser doesn't seem to support HTML5 Web Workers, this application won't work without it.", "Initialization error", true);
            fail = true;
        }
        if (!Modernizr.svg) {
            notify.error("Your browser doesn't seem to support HTML5 SVG, this application won't work without it.", "Initialization error", true);
            fail = true;
        }
        if (fail) {
            console.log("Initialization failed: unsupported browser.");
            throw { name: "Unsupported Browser" };
        }

        var warnings = [];
        if (!Modernizr.webgl) {
            notify.warning("Your browser doesn't seem to support HTML5 Web GL, 3d mode is not recommended, going to be SLOW!", "Initialization warning", true);
            GCODE.renderer3d.setOption({rendererType: "canvas"});
        }
        if (!Modernizr.draganddrop) {
            notify.warning("Your browser doesn't seem to support HTML5 Drag'n'Drop, Drop area will not work.", "Initialization warning", true);
        }
        return true;
    };


    /**
     * Initialize UI.
     */
    var init = function () {
        checkCapabilities();
        initFileSelect();
    }
    init();

    return {
        /**
         * Contains helpers to display notifications.
         */
        notify: {
            /**
             * Display info notification
             *
             * @param {string} message The actual notification message
             * @param {string} title [Optional] A title for the notification
             * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
             */
            info: notify.info,

            /**
             * Display success notification
             *
             * @param {string} message The actual notification message
             * @param {string} title [Optional] A title for the notification
             * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
             */
            success: notify.success,

            /**
             * Display warning notification
             *
             * @param {string} message The actual notification message
             * @param {string} title [Optional] A title for the notification
             * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
             */
            warning: notify.warning,

            /**
             * Display error notification
             *
             * @param {string} message The actual notification message
             * @param {string} title [Optional] A title for the notification
             * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
             */
            error: notify.error
        }
    };
});