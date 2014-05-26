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

    var templates = {
        snapshotModal: _.template('\
            <span class="helper"></span>\
            <a download="<%= filename %>" href="<%= image %>">\
                <img src="<%= image %>" />\
            </a>\
        ')
    }

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
     * Binds the event handlers for the preferences form.
     *
     * @param {boolean} bind pass true to bind, false to unbind
     */
    var preferencesFormHandlers = function(bind) {
        $("[data-config-bind]").each(function() {
            if (bind) {
                $(this).bind("change", handlePreferencesChanged);
            } else {
                $(this).unbind("change", handlePreferencesChanged);
            }
        });
    }

    /**
     * Writes the config values to the form elements.
     */
    var updatePreferencesForm = function() {
        preferencesFormHandlers(false);
        var options = app.getConfig().getOptions();
        for (var key in options) {
            var el = $("[data-config-bind='" + key + "']");
            if (el.is("[type='text']")) {
                el.val(options[key]);
            } else if (el.is("[type='checkbox']")) {
                el.prop("checked", options[key]);
            } else if (el.is("[type='radio']")) {
                el.filter("[value='" + options[key] + "']").click();
            }
        }
        preferencesFormHandlers(true);
    };

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
     * Takes a snapshot of the canvas the mouse is hovering over.
     */
    var takeScreenshot = function() {
        var canvas = null;
        $("canvas").each(function(index, cur) {
            if ($(cur).parent().is(":hover")) {
                canvas = cur;
            }
        });
        if (canvas == null) {
            notify.info("Please place your mouse pointer over the canvas you want to take the screenshot from.", "Cannot take screenshot.");
            return;
        }

        var destinationCanvas = document.createElement("canvas");
        destinationCanvas.width = canvas.width;
        destinationCanvas.height = canvas.height;
        var destCtx = destinationCanvas.getContext('2d');
        // create a rectangle with the desired color
        destCtx.fillStyle = "#FFFFFF";
        destCtx.fillRect(0,0,canvas.width,canvas.height);

        //draw the original canvas onto the destination canvas
        var oldDrawGrid = app.getConfig().drawGrid.get();
        app.getConfig().drawGrid.set(false);
        destCtx.drawImage(canvas, 0, 0);
        app.getConfig().drawGrid.set(oldDrawGrid);

        var filename = $(canvas).parents(".view").find(".loaded-gcode").text();
        if (filename.indexOf(".")) {
            filename = filename.substr(0, filename.lastIndexOf("."));
        }
        var now = new Date();
        var p = function(n) { return ('0' + n).slice(-2) }
        var date = [now.getFullYear(), p(now.getMonth() + 1) , p(now.getDate())].join("-");
        date += "_" + [p(now.getHours()), p(now.getMinutes()), p(now.getSeconds())].join("-");

        $("#screenshot-modal").html(templates.snapshotModal({
            filename: filename + "_" + date + ".png",
            image: destinationCanvas.toDataURL("image/png")
        }));
        $("#screenshot-modal").modal({ show: true });
    }

    /**
     * Initializes a window that holds the GCode viewer app
     *
     * @param w the actual window object
     */
    var initWindow = function(w) {
        // bind resize handler
        $(w).resize(function() {
            app.resize();
        });

        // dispatch key presses
        $(w).keydown(function(event) {
            if (event.keyCode === 38 || event.keyCode === 33) {
                // up key || page up
                events.view.renderer2d.moveLayerUp.dispatch("", event);
            } else if (event.keyCode === 40 || event.keyCode === 34) {
                // down key || page down
                events.view.renderer2d.moveLayerDown.dispatch("", event);
            } else if (event.keyCode === 80) {
                // p key
                event.preventDefault();
                takeScreenshot();
            } else if (event.keyCode === 68) {
                // d key
                event.preventDefault();
                $("#diff").click();
            } else if (event.keyCode === 65) {
                // a key
                event.preventDefault();
                var hovered = app.getHoveredView();
                console.log("a");
                if (hovered != null) {
                    console.log("hovered");
                    hovered.adjustToThis();
                }
            } else if (event.keyCode === 83) {
                // s key
                event.preventDefault();
                $("#sync").click();
            }
        });

        // init settings
        app.resize();
        events.navigation.show2d.dispatch();
    };

    /**
     * Initialize UI.
     */
    var init = function () {
        checkCapabilities();
        updatePreferencesForm();
        initFileSelect();
        progress.reset();
        initWorker();
        initNavigation();
        app.getConfig().configChangedEvent.add(updatePreferencesForm);

        // sync handling
        $("#sync").click(function() {
            app.getConfig().synced.set(!$("#sync").hasClass("active"));
        });

        // diff handling
        $("#diff").click(function() {
            var diff = !$("#diff").hasClass("active");
            if (diff) {
                $("#viewContainer").addClass("diff");
            } else {
                $("#viewContainer").removeClass("diff");
            }
            app.getConfig().diff.set(diff);
            app.resize();
        });

        // set preferences to default
        $("#preferences-to-defaults").click(function() {
            app.getConfig().toDefaults();
            notify.info("Default preferences loaded.");
        });

        // initialize this window
        initWindow(window);

        // open new window
        $("#newWindow").click(function() {
            var newWindow = window.open("", "gCodeViewer", "width=100, height=100");
            newWindow.document.open();
            newWindow.moveTo(0,0);
            newWindow.resizeTo(screen.width,screen.height);

            var html = '\
            <!DOCTYPE html>\
            <html>\
                <head>\
                    <link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">\
                    <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" media="screen">\
                    <link rel="stylesheet" type="text/css" href="css/gCodeViewer.css" />\
                </head>\
                <body>\
                    <div class="app">\
                        <div id="secondViewContainer" class="viewContainer">\
                            <div id="secondView1" class="viewLeft"></div>\
                            <div id="secondView2" class="viewRight"></div>\
                        </div>\
                    </div>\
                </body>\
            </html>\
            ';
            newWindow.document.write(html);
            newWindow.document.close();
            app.createView("test1", $(newWindow.document).find("#secondView1"));
            app.createView("test2", $(newWindow.document).find("#secondView2"));

            initWindow(newWindow);
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