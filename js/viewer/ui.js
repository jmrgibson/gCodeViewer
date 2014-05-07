/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */

GCODE.ui = (function (app, eventManager) {

    /**
     * Holds the GCode application
     * @type {GCODE.app}
     */
    var app = app;

    /**
     * GCode event manager
     * @type {GCODE.events}
     */
    var events = eventManager;

    /**
     * Worker used to process GCode files
     */
    var worker;

    /**
     * Holds some underscore templates
     */
    var templates = {
        view: _.template('\
            <div class="form-group">\
                <label for="view-<%= id %>"><%= name %></label>\
                <select class="form-control" data-view-id="<%= id %>">\
                    <% _.each(options, function(option) { %>\
                        <option value="<%= option.value %>"><%= option.name %></option>\
                    <% }); %>\
                </select>\
            </div>\
        ')
    };

    /**
     * Dispalys a notification message.
     *
     * @param {string} message the message to display
     * @param {string} title
     * @param {string} severity
     * @param {boolean} sticky
     * @private
     */
    var _notify = function (message, title, severity, sticky) {
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
            z_index: 1100,
            position: { from: "bottom", align: "right" },
            delay: (sticky != null && sticky) ? 0 : 5000
        });
    };

    /**
     * Contains a set of notification helpers.
     */
    var notify = {

        /**
         * Display info notification
         *
         * @param {string} message The actual notification message
         * @param {string} title [Optional] A title for the notification
         * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
         */
        info: function (message, title, sticky) {
            _notify(message, title, "info", sticky);
        },

        /**
         * Display warning notification
         *
         * @param {string} message The actual notification message
         * @param {string} title [Optional] A title for the notification
         * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
         */
        warning: function (message, title, sticky) {
            _notify(message, title, "warning", sticky);
        },

        /**
         * Display error notification
         *
         * @param {string} message The actual notification message
         * @param {string} title [Optional] A title for the notification
         * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
         */
        error: function (message, title, sticky) {
            _notify(message, title, "danger", sticky);
        },

        /**
         * Display success notification
         *
         * @param {string} message The actual notification message
         * @param {string} title [Optional] A title for the notification
         * @param {boolean} sticky [Optional] A sticky notification will not automatically disappear. Default is false.
         */
        success: function (message, title, sticky) {
            _notify(message, title, "success", sticky);
        }
    }

    /**
     * Listener waiting for messages from the worker. Will forward the messages to the event manager.
     *
     * @param e event message
     */
    var workerMessageListener = function (e) {
        var data = e.data;
        switch (data.cmd) {
            case 'returnModel':
                events.process.returnModel.dispatch();
                break;
            case 'analyzeDone':
                events.process.analyzeDone.dispatch(data.msg);
                break;

            case 'returnLayer':
                events.process.returnLayer.dispatch(data.msg);
                break;

            case 'returnMultiLayer':
                events.process.returnMultiLayer.dispatch(data.msg);
                break;

            case "analyzeProgress":
                events.process.analyzeProgress.dispatch(data.msg);
                break;

            default:
                console.log("default msg received" + data.cmd);
        }
    };

    // add default UI listeners
    events.process.returnModel.add(function () {
        progress.set(progress.load, 100);
        notify.success("GCode has been parsed");
    });
    events.process.analyzeDone.add(function (data) {
        progress.set(progress.analyze, 100);
        notify.success("GCode has been analyzed and is ready to be displayed");
        // TODO: move to view
//        initSliders();
//        printModelInfo();
//        printLayerInfo(0);
//        chooseAccordion('infoAccordionTab');
//        GCODE.ui.updateOptions();
//        $('#tab-nav').find('a[href="#tab2d"]').click();
//        $('#runAnalysisButton').removeClass('disabled');
//        $("#layer-info").show();
    });
    events.process.returnLayer.add(function (data) {
        progress.set(progress.load, data.progress);
    });
    events.process.returnMultiLayer.add(function (data) {
        progress.set(progress.load, data.progress);
    });
    events.process.analyzeProgress.add(function (data) {
        progress.set(progress.analyze, data.progress);
    });
    events.process.toWorker.add(function (cmd) {
        worker.postMessage(cmd);
    });

    /**
     * Initializes the worker
     */
    var initWorker = function () {
        worker = new Worker('js/reader/worker.js');
        worker.addEventListener('message', workerMessageListener, false);
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
     * Control progress bar
     */
    var progress = {
        /** ID of load progress bar */
        load: "loadProgress",
        /** ID of analyze progress bar */
        analyze: "analyzeProgress",

        /**
         * Sets the progress bar to a certain value.
         *
         * @param {string} id Progress bar id
         * @param {float} progress the actual progress
         */
        set: function (id, progress) {
            $('#' + id).width(parseInt(progress) + '%').text(parseInt(progress) + '%');
        },

        /**
         * Resets both progress bars to zero.
         */
        reset: function () {
            this.set(progress.load, 0);
            this.set(progress.analyze, 0);
        }
    }

    /**
     * Handler used to load a new GCode file from the file upload.
     *
     * @param evt
     */
    var handleFileSelect = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        /** @var files FileList */
        var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files;

        var output = [];
        for (var i = 0, f; f = files[i]; i++) {
            if (f.name.toLowerCase().match(/^.*\.(?:gcode|g|txt|gco)$/)) {
                notify.success('Starting to process the uploaded GCode file.');
            } else {
                notify.error('You should only upload *.gcode files! I will not work with this one!');
                return;
            }

            var reader = new FileReader();
            reader.onload = (function (filename) {
                return function(theFile) {
                    progress.reset();
                    app.loadGCode(filename, theFile.target.result);
                };
            })(f.name);
            reader.readAsText(f);
        }
    };

    /**
     * File select drag over event handler
     *
     * @param evt drag event
     */
    var handleFileSelectDragOver = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.target.dropEffect = 'copy'; // Explicitly show this is a copy.
    };

    /**
     * File select UI initialization
     */
    var initFileSelect = function () {
        // initialize GCode drag&drop
        var dropZone = $('#drop_zone');
        dropZone[0].addEventListener('dragover', handleFileSelectDragOver, false);
        dropZone[0].addEventListener('drop', handleFileSelect, false);
        $('#file').bind('change', handleFileSelect, false);
    }

    /**
     * Event handler for a single preferences item. Should be called onChange.
     */
    var handlePreferencesChanged = function() {
        var key = $(this).attr("data-config-bind");
        if ($(this).attr("type") == "checkbox") {
            var value = $(this).prop("checked");
        } else {
            var value = $(this).val();
        }
        var options = {}
        options[key] = value;
        if (app.getConfig().setOptions(options)) {
            notify.success("Saved config");
        } else {
            notify.error("Could not save config, please verify that your input is well-formatted.");
        }
    };

    /**
     * Initializes the perferences page
     */
    var initPreferences = function() {
        // bind config changed handlers
        $("[data-config-bind]").each(function() {
            $(this).change(handlePreferencesChanged);
        });

        // TODO: set initial form values from config
    }

    /**
     * Initializes navigation buttons
     */
    var initNavigation = function() {
        var removeActive = function() {
            $('a[href="#tab2d"], a[href="#tab3d"], a[href="#tabGCode"]').parent("li.active").removeClass("active");
        }
        $('a[href="#tab2d"]').click(function (e) {
            events.navigation.show2d.dispatch();
            removeActive();
            $('a[href="#tab2d"]').parent("li").addClass("active");
            return e.preventDefault();
        });
        $('a[href="#tab3d"]').click(function (e) {
            events.navigation.show3d.dispatch();
            removeActive();
            $('a[href="#tab3d"]').parent("li").addClass("active");
            return e.preventDefault();
        });
        $('a[href="#tabGCode"]').click(function (e) {
            events.navigation.showGCode.dispatch();
            removeActive();
            $('a[href="#tabGCode"]').parent("li").addClass("active");
            return e.preventDefault();
        });
    }

    /**
     * Initializes the display manager
     */
    var initDiplayManager = function() {
        // gcodes
        var gcodes = [{ name: "--- Please choose a GCode to display ---", value: "" }];
        _.each(app.getRepository().list(), function(gcode) {
            gcodes.push({
                name: gcode,
                value: gcode
            });
        });

        // views
        var modalHtml = "";
        _.each(app.getViews(), function(view) {
            var id = view.replace(/\W+/ig, '');
            modalHtml += templates.view({
                name: view,
                id: id,
                options: gcodes
            });
        });
        $("#display-manager .modal-body").html(modalHtml);

        // select change handler
        $("#display-manager select").change(function() {
            var gcode = $(this).val();
            var view = $(this).attr("data-view-id");
            console.log(view);
            console.log(gcode);
            if (gcode != "" && view != "") {
                app.display(gcode, view);
                app.getEventManager().navigation.show2d.dispatch();
            } else {
                notify.warning("Please choose valid view and valid GCode");
            }
        });
    }

    /**
     * Initialize UI.
     */
    var init = function () {
        checkCapabilities();
        initPreferences();
        initFileSelect();
        progress.reset();
        initWorker();
        initNavigation();

        $('a[data-target="#display-manager"]').click(initDiplayManager);
        $("#sync").click(function() {
            app.getConfig().synced.set(!$(this).hasClass("active"));
        });
    }
    init();

    return {
        /**
         * @var {notify}
         */
        notify: notify
    };
});