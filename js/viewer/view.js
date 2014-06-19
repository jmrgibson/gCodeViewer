/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 03/30/14
 * Time: 5:54 PM
 */
GCODE.view = (function (viewName, domRoot, app) {

    /**
     * The views name.
     * @type {string}
     */
    var name = viewName;

    /**
     * Holds the DOM root node of the view as jQuery selector
     * @type {jQuery}
     */
    var root = $(domRoot);

    /**
     * Holds the GCode app event manger
     * @type {GCODE.events}
     */
    var events = app.getEventManager();

    /**
     * Holds the GCode to be displayed in this view.
     * @type {GCODE.reader}
     */
    var gcode = null;

    /**
     * Holds the 2D GCode renderer
     * @type {GCODE.renderer}
     */
    var renderer2d;

    /**
     * Holds the 3D GCode renderer
     * @type {GCODE.renderer3d}
     */
    var renderer3d;

    /**
     * Display type enum
     * @type {{speed: number, expermm: number, volpersec: number}}
     */
    var displayType = {speed: 1, expermm: 2, volpersec: 3};

    /**
     * Holds the GCode app config
     * @type {GCODE.config}
     */
    var config = app.getConfig();

    /**
     * Holds the gCode repository
     * @type {GCODE.repository}
     */
    var repository = app.getRepository();

    /**
     * The lines of GCode of the current layer
     * @type {{first: number, last: number}}
     */
    var gCodeLines = {first: 0, last: 0};

    /**
     * Holds vertical slider of current 2D view
     */
    var sliderVer;

    /**
     * Holds horizontal slider of current 2D view
     */
    var sliderHor;

    /**
     * The toolbar to change the currently loaded gCode
     */
    var gCodeSelectToolbar;

    /**
     * The current layer info toolbar
     */
    var layerInfoToolbar;

    /**
     * The toolbar for the color legend
     */
    var colorLegendToolbar;

    /**
     * Holds the snapshot service
     * @type {GCODE.snapshot}
     */
    var snapshotService;

    /**
     * Contains this instance.
     * @type {GCODE.view}
     */
    var self = this;

    /**
     * Holds some underscore templates used to render the legends.
     */
    var templates = {

        /** whole view container */
        container: _.template('\
            <div class="view">\
                <% _.each(tabs, function (tab) { %><%= tab %><% }); %>\
            </div>\
        '),

        /** single tab in view */
        tab: _.template('<div class="tab tab<%= id %>"><%= content %></div>'),

        /** tab content for gcode displaying */
        tabGCode: _.template('<div class="gCodeContainer"></div>'),

        /** tab content for 3d rendering */
        tab3d: _.template('<div class="3d_container"></div>'),

        /** tab content for 2d rendering */
        tab2d: _.template('\
            <div class="toolbar">\
                <div class="tool tool-toggl color-legend" style="width: 50px;">\
                    <i class="fa fa-tint"></i>\
                     <div class="tool-dropdown-content">\
                        <div class="extrudeSpeeds"></div>\
                     </div>\
                </div>\
                <div class="tool tool-dropdown gcode-selector">\
                    <span class="loaded-gcode">Choose gCode to display</span>\
                    <p class="tool-footnote loaded-line">\
                        <span class="loaded-slicer"></span>, <span class="loaded-line-first"></span> - <span class="loaded-line-last"></span>\
                    </p>\
                    <div class="tool-dropdown-content">\
                        <ul class="gcode-select"></ul>\
                    </div>\
                </div>\
                <div class="tool tool-dropdown layer-info" style="width: 181px;">\
                    Layer info\
                    <p class="tool-footnote">\
                        <span class="curLayer">0</span> / <span class="maxLayer"></span>\
                    </p>\
                    <div class="tool-dropdown-content">\
                        <ul class="metrics"></ul>\
                    </div>\
                </div>\
                <div class="tool" data-trigger="view.renderer2d.snapshot">\
                    <i class="fa fa-camera"></i>\
                </div>\
                <div class="tool" data-trigger="view.exportXYZ">\
                    <i class="fa fa-share-square-o"></i>\
                </div>\
            </div>\
            <div class="scrollbar">\
                <div class="scrollbar-group">\
                    <span class="scrollbar-plus"><i class="fa fa-arrow-up"></i></span>\
                    <div class="scrollbar-control">\
                        <input class="layer-scrollbar" value="" data-slider-id="layer-scrollbar" type="text" />\
                    </div>\
                    <span class="scrollbar-minus"><i class="fa fa-arrow-down"></i></span>\
                </div>\
            </div>\
            <canvas class="render2d"></canvas>\
        '),

        /** Tab used to display the snapshot */
        tabSnapshot: _.template('\
            <div class="toolbar" style="width: 300px;">\
                <a download="" href="#" class="btn btn-default btn-sm download"><i class="fa fa-download"></i> Download</a>\
                <a href="#" class="btn btn-default btn-sm download-all"><i class="fa fa-cloud-download"></i> Download all</a>\
            </div>\
            <div class="snap-container">\
                <span class="helper"></span>\
                <img src="" class="snapshot" alt="No snapshot taken." />\
            </div>\
            '),

        /** 2D model info: used to render a single metric */
        li: _.template('\
            <li class="metric">\
                <span class="title"><%= tooltip %></span>\
                <i class="fa fa-<%= icon %>"></i>\
                <span class="value"><%= metric %></span>\
            </li>'),

        /** 2D model info: used to render extrusion/move speeds */
        colorBox: _.template('\
            <div class="colorbox">\
                <div class="color" style="background-color: <%= color %>">\
                    <span><%= speed %></span>\
                </div>\
            </div>'),

        /** 2D model info: used to render retract speeds. */
        colorBoxRetract: _.template('\
            <div class="colorbox colorbox-rounded">\
                <div class="color" style="background-color: <%= retract %>"></div>\
                <div class="color" style="background-color: <%= restart %>"></div>\
                <span><%= speed %></span>\
            </div>'),

        /** Used to render all gCode names as list items */
        gCodeLi: _.template('\
            <% _.each(gCodes, function(gcode) { %>\
                <li>\
                    <span class="label label-default"><%= gcode.slicer %></span>\
                    <span class="filename"><%= gcode.name %></span>\
                </li>\
            <% }); %>')
    };

    /**
     * Creates a toolbar from a bootstrap panel group.
     *
     * @param toolbar
     */
    var Toolbar = function(toolbar) {
        var iconOpen = "fa-chevron-circle-down";
        var iconClose = "fa-chevron-circle-up";

        var isOpen = function() {
            return toolbar.hasClass("tool-dropdown-open");
        }

        var open = function() {
            toolbar.addClass("tool-dropdown-open");
        };

        var close = function() {
            toolbar.removeClass("tool-dropdown-open");
        }

        var toggle = function() {
            if (isOpen()) {
                close();
            } else {
                open();
            }
        }
        toolbar.click(toggle);

        return {
            toggle: toggle,
            open: open,
            close: close
        };
    }

    /**
     * Creates the views HTML.
     *
     * @returns {string} viewHtml
     */
    var createViewHtml = function() {
        return templates.container({
            tabs: [
                templates.tab({
                    id: "2d",
                    content: templates.tab2d()
                }),
                templates.tab({
                    id: "3d",
                    content: templates.tab3d()
                }),
                templates.tab({
                    id: "GCode",
                    content: templates.tabGCode()
                }),
                templates.tab({
                    id: "Snapshot",
                    content: templates.tabSnapshot()
                })
            ]
        });
    };

    /**
     * Helper used to ease the creation of speed outputs.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @param {Array} layerSpeeds Array of layer speeds
     * @param {function} createOutput Callback function to create a output speed object: createOutput(layerSpeed, speedIndex)
     * @returns {Array} stack of speed description objects
     */
    var prepareHelper = function (z, renderOptions, layerSpeeds, createOutput) {
        var speedIndex = 0;
        var colorLen = renderOptions['colorLineLen'];
        var output = [];
        if (typeof(layerSpeeds) === 'undefined') {
            return output;
        }
        for (var i = 0; i < layerSpeeds.length; i++) {
            if (typeof(layerSpeeds[i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push(createOutput(layerSpeeds[i], speedIndex));
        }
        return output;
    }

    /**
     * Prepare the legend for simple move speeds.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @returns {Array} stack of speed description objects
     */
    var prepareMoveSpeeds = function (z, renderOptions) {
        var layerSpeeds = gcode.getModelInfo().speedsByLayer;
        return prepareHelper(z, renderOptions, layerSpeeds['move'][z], function (layerSpeed, speedIndex) {
            return {
                color: renderOptions['colorMove'],
                speed: (parseFloat(layerSpeed) / 60).toFixed(2) + " mm/s"
            };
        });
    }

    /**
     * Prepare the legend for retract speeds.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @returns {Array} stack of speed description objects
     */
    var prepareRetractSpeeds = function (z, renderOptions) {
        var layerSpeeds = gcode.getModelInfo().speedsByLayer;
        return prepareHelper(z, renderOptions, layerSpeeds['retract'][z], function (layerSpeed, speedIndex) {
            return {
                retract: renderOptions['colorRetract'],
                restart: renderOptions['colorRestart'],
                speed: (parseFloat(layerSpeed) / 60).toFixed(2) + " mm/s"
            };
        });
    }

    /**
     * Prepare the legend for the extrusion speeds.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @returns {Array} stack of speed description objects
     */
    var prepareExPerSec = function (z, renderOptions) {
        var layerSpeeds = gcode.getModelInfo().speedsByLayer;
        var colors = renderOptions["colorLine"];
        return prepareHelper(z, renderOptions, layerSpeeds['extrude'][z], function (layerSpeed, speedIndex) {
            return {
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeed) / 60).toFixed(2)
            };
        });
    }

    /**
     * Prepare the legend for extrusion speed per mm.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @returns {Array} stack of speed description objects
     */
    var prepareExPerMMInfo = function (z, renderOptions) {
        var layerSpeeds = gcode.getModelInfo().volSpeedsByLayer;
        var colors = renderOptions["colorLine"];
        return prepareHelper(z, renderOptions, layerSpeeds[z], function (layerSpeed, speedIndex) {
            return {
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeed)).toFixed(3) + "mm/mm"
            };
        });
    }

    /**
     * Prepare the legend for extrusion volume per sec.
     *
     * @param {int} z layer level to prepare
     * @param {Array} renderOptions the render options to use
     * @returns {Array} stack of speed description objects
     */
    var prepareVolPerSecInfo = function (z, renderOptions) {
        var layerSpeeds = gcode.getModelInfo().extrusionSpeedsByLayer;
        var gCodeOptions = gcode.getOptions();
        var colors = renderOptions["colorLine"];
        return prepareHelper(z, renderOptions, layerSpeeds[z], function (layerSpeed, speedIndex) {
            return {
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeeds[z][i] * 3.141 * gCodeOptions['filamentDia'] / 10 * gCodeOptions['filamentDia'] / 10 / 4)).toFixed(3) + "mm^3/sec"
            };
        });
    }

    /**
     * Updates the layer info panel.
     *
     * @param {Number} layerNum layer level to display
     */
    var printLayerInfo = function(layerNum) {
        var z = renderer2d.getZ(layerNum);
        var segments = gcode.getLayerNumSegments(layerNum);
        var renderOptions = renderer2d.getOptions();
        var filament = gcode.getLayerFilament(z);

        // current layer
        root.find(".layer-info .curLayer").text(layerNum);

        // layer metrics
        var metrics = "";
        metrics += templates.li({
            tooltip: "Layer height",
            icon: "arrows-v",
            metric: z + "mm"
        });
        metrics += templates.li({
            tooltip: "GCODE commands",
            icon: "code",
            metric: segments
        });
        metrics += templates.li({
            tooltip: "Filament used",
            icon: "dashboard",
            metric: filament.toFixed(2) + "mm"
        });
        metrics += templates.li({
            tooltip: "Print time",
            icon: "clock-o",
            metric: parseFloat(gcode.getModelInfo().printTimeByLayer[z]).toFixed(1) + "sec"
        });
        root.find(".layer-info .metrics").html(metrics).find("li").tooltip();

        // helper to compile a speed legend into HTML using the given underscore template
        var _toHtml = function(speeds, template) {
            var html = "";
            speeds = _.sortBy(speeds, function(el) {
                return el.speed;
            });
            _.each(speeds, function(el) {
                html += template(el);
            });
            return html;
        }

        // extrusion speeds
        var exSpeed;
        if (renderOptions['speedDisplayType'] == displayType.speed) {
            exSpeed = prepareExPerSec(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] == displayType.expermm) {
            exSpeed = prepareExPerMMInfo(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] == displayType.volpersec) {
            exSpeed = prepareVolPerSecInfo(z, renderOptions);
        }
        root.find(".extrudeSpeeds").html(_toHtml(exSpeed, templates.colorBox));

        // move speeds
        var moveSpeed = prepareMoveSpeeds(z, renderOptions);
        root.find(".moveSpeeds").html(_toHtml(moveSpeed, templates.colorBox));

        // retract speeds
        var retractSpeed = prepareRetractSpeeds(z, renderOptions);
        root.find(".retractSpeeds").html(_toHtml(retractSpeed, templates.colorBoxRetract));
    };

    /**
     * Updates the scrollbars
     * @private
     */
    var _updateScrollbar = function() {
        // TODO: fix horizontal slider
        // sliderHor = $( "#slider-horizontal" );

        var maxLayer = gcode.getModelNumLayers() - 1;
        root.find(".layer-info .maxLayer").text(maxLayer);

        if (sliderVer !== undefined) {
            sliderVer.slider("destroy");
        }
        sliderVer = root.find(".layer-scrollbar");
        sliderVer.slider({
            reversed : true,
            orientation: "vertical",
            tooltip: "hide",
            enabled: true,
            value: 0,
            min: 0,
            max: maxLayer,
            step: 1
        });
        sliderVer.on("slide", function( event ) {
            if (Object.prototype.toString.call( event.value ) === "[object Number]") {
                events.view.renderer2d.toLayer.dispatch(name, event.value);
            }
        });

        //this stops slider reacting to arrow keys, since we do it below manually
        // $( "#slider-vertical").find(".ui-slider-handle" ).unbind('keydown');

//        sliderHor.slider({
//            orientation: "horizontal",
//            range: "min",
//            min: 0,
//            max: GCODE.renderer.getLayerNumSegments(0)-1,
//            values: [0,GCODE.renderer.getLayerNumSegments(0)-1],
//            slide: function( event, ui ) {
//                setLinesColor(false); //clear current selection
//                gCodeLines = GCODE.gCodeReader.getGCodeLines(sliderVer.slider("value"),ui.values[0], ui.values[1]);
//                setLinesColor(true); // highlight lines
//                GCODE.renderer.render(sliderVer.slider("value"), ui.values[0], ui.values[1]);
//            }
//        });
    }

    /**
     * Only forwards events if current view is affected.
     *
     * @param {Function} handler to forward event to
     * @param {boolean} gCodeLoaded True to be affected only iff gcode is loaded
     * @returns {Function}
     * @private
     */
    var _ifAffected = function(handler, gCodeLoaded) {
        if (gCodeLoaded != false && gCodeLoaded != true) {
            gCodeLoaded = true;
        }
        return function (viewName) {
            if (gCodeLoaded && gcode == null) {
                return;
            }
            if (viewName == name || true === config.synced.get() || true === config.diff.get() || root.is(":hover")) {
                handler.apply(handler, arguments);
            }
        }
    }

    /**
     * Function to be called if the layer changes
     *
     * @param {int} layer number
     */
    var onLayerChange = function(layer){
        var progress = gcode.getLayerNumSegments(layer) - 1;
        renderer2d.render(layer, 0, progress);
        // sliderHor.slider({max: progress, values: [0,progress]});
        // gCodeLines = GCODE.gCodeReader.getGCodeLines(val, sliderHor.slider("values",0), sliderHor.slider("values",1));

        gCodeLines = gcode.getGCodeLines(layer, 0, gcode.getLayerNumSegments(layer) - 1);
        root.find(".gcode-selector .loaded-line-first").text(gCodeLines.first);
        root.find(".gcode-selector .loaded-line-last").text(gCodeLines.last);
        printLayerInfo(layer);
    };

    /**
     * Event handler to go one layer up and adjusting the slider value
     */
    var oneLayerUpIfPossible = function() {
        var maxLayer = gcode.getModelNumLayers() - 1;
        if (sliderVer.slider('getValue') < maxLayer) {
            sliderVer.slider('setValue', sliderVer.slider('getValue') + 1);
            onLayerChange(sliderVer.slider('getValue'));
        }
    }

    /**
     * Event handler to go one layer down and adjusting the slider value
     */
    var oneLayerDownIfPossible = function() {
        var maxLayer = gcode.getModelNumLayers() - 1;
        if (sliderVer.slider('getValue') > 0) {
            sliderVer.slider('setValue', sliderVer.slider('getValue') - 1);
            onLayerChange(sliderVer.slider('getValue'));
        }
    }

    // register event listeners.
    events.view.renderer2d.moveLayerUp.add(_ifAffected(oneLayerUpIfPossible));
    events.view.renderer2d.moveLayerDown.add(_ifAffected(oneLayerDownIfPossible));
    events.view.renderer2d.toLayer.add(_ifAffected(function(viewName, layerNum) {
        var maxLayer = gcode.getModelNumLayers();
        if (layerNum < maxLayer) {
            sliderVer.slider('setValue', layerNum);
            onLayerChange(layerNum);
        }
    }));

    /**
     * Updates the gCode select box.
     */
    var updateGCodeSelectBox = function() {
        var gCodes = [];
        repository.list().forEach(function(name) {
            gCodes.push({
                name: name,
                slicer: repository.find(name).getSlicer()
            });
        });
        if (gCodes.length == 0) {
            root.find(".gcode-selector").hide();
        } else {
            root.find(".gcode-selector").show();
            root.find(".gcode-select").html(templates.gCodeLi({
                gCodes: gCodes
            }));
            root.find(".gcode-select li").click(function() {
                var gCodeName = $(this).find(".filename").text().trim();
                self.load(repository.find(gCodeName));
                gCodeSelectToolbar.close();
            });
        }
    };
    events.repository.added.add(updateGCodeSelectBox);

    /**
     * To be invoked if the gCode reader changes
     */
    var gCodeChanged = function() {
        if (gcode == null) {
            root.find(".scrollbar").hide();
            root.find(".layer-info").hide();
            root.find(".gcode-selector .loaded-line").hide();
        } else {
            _updateScrollbar();
            onLayerChange(0);
            root.find(".scrollbar").show();
            root.find(".layer-info").show();
            root.find(".gcode-selector .loaded-line").show();
            root.find(".gcode-selector .loaded-gcode").text(gcode.getName());
            root.find(".gcode-selector .loaded-slicer").text(gcode.getSlicer());
        }
    };

    /**
     * Initializes the 2D tab of the view
     */
    var init2d = function() {
        // init 2d renderer
        var canvasRoot = root.find(".render2d");
        renderer2d = new GCODE.renderer(canvasRoot, config, self, events);

        /**
         * Used to send a signal from a native event handler.
         *
         * @param {signals.Signal} signal
         * @returns {Function} dispatcher
         */
        var sendSignal = function(signal) {
            return function(e) {
                signal.dispatch(name, e);
            }
        }

        // bind slider control buttons to change layer
        root.find(".tab2d .scrollbar-plus").mousedown(sendSignal(events.view.renderer2d.moveLayerUp));
        root.find(".tab2d .scrollbar-minus").mousedown(sendSignal(events.view.renderer2d.moveLayerDown));

        // toolbar closeable event handler
        gCodeSelectToolbar = new Toolbar(root.find(".gcode-selector"));
        layerInfoToolbar = new Toolbar(root.find(".layer-info"));
        colorLegendToolbar = new Toolbar(root.find(".color-legend"));
    };

    var initEventTriggers = function() {
        root.find("[data-trigger]").click(function(e) {
            var eventPath = $(this).attr("data-trigger").split(".");
            var event = events;
            for (var cur = 0; cur < eventPath.length; cur++) {
                if (!(eventPath[cur] in event)) {
                    console.log("Event " + $(this).attr("data-trigger") + " cannot be triggered!");
                    return;
                }
                event = event[eventPath[cur]];
            }
            event.dispatch(name, e);
        });
    };

    /**
     * Initializes the 3D tab of the view.
     */
    var init3d = function() {
        renderer3d = new GCODE.renderer3d(self);
    }

    /**
     * Hides the active content tab within the view
     */
    var hideActiveTab = function() {
        root.find(".tab.active").removeClass("active");
    }

    /**
     * Holds the navigation
     */
    this.navigation = {
        /**
         * Opens the 2D layer view in this view
         */
        show2d: function () {
            hideActiveTab();
            root.find(".tab2d").addClass("active");
        },

        /**
         * Opens the 3D model in this view
         */
        show3d: function () {
            hideActiveTab();
            root.find(".tab3d").addClass("active");
        },

        /**
         * Opens the GCode source in this view
         */
        showGCode: function () {
            hideActiveTab();
            root.find(".tabGCode").addClass("active");
        },

        showSnapshot: function() {
            hideActiveTab();
            root.find(".tabSnapshot").addClass("active");
        }
    };

    /* Register event listeners to change tabs for whole application */
    events.navigation.show2d.add(this.navigation.show2d);
    events.navigation.show3d.add(this.navigation.show3d);
    events.navigation.showGCode.add(this.navigation.showGCode);
    events.view.renderer2d.snapshot.add(_ifAffected(function() {
        snapshotService.takeSnapshot();
        self.navigation.showSnapshot();
    }, false));

    /**
     * Export function
     */
    var exportXYZ = function() {
        var model = gcode.getModel();
        var e = "";
        var id = 0;
        for (var layer = 0; layer < model.length; layer++) {
            for (var point = 0; point < model[layer].length; point++) {
                var p = model[layer][point];
                e += [id, p.x, p.y, p.z].join(",") + "\n";
                id++;
            }
        }

        // download
        var gcodeBlob = new Blob([e], {type: "text/plain;charset=utf-8"});
        saveAs(gcodeBlob, gcode.getName() + ".xyz");
    };
    events.view.exportXYZ.add(_ifAffected(exportXYZ));


    /**
     * Returns the views name.
     *
     * @returns {string}
     */
    this.getName = function() {
        return name;
    }

    /**
     * Returns the height of this view
     * @returns {css|*|css|css}
     */
    this.getHeight = function() {
        return domRoot.css("height");
    };

    /**
     * Returns the width of this view
     * @returns {css|*|css|css}
     */
    this.getWidth = function() {
        return domRoot.css("width");
    };

    /**
     * Returns the DOM root element of this view.
     * @returns {*}
     */
    this.getRoot = function() {
        return domRoot;
    };

    /**
     * Resizes the view.
     */
    this.resize = function() {
        renderer2d.resizeCanvas();
    };

    /**
     * Loads a GCode into this view
     *
     * @param {GCODE.reader} reader
     */
    this.load = function (reader) {
        gcode = reader;
        renderer2d.load(reader);
        renderer3d.setModel(reader);
        renderer3d.doRender();
        gCodeChanged();
//            if (showGCode) {
//                myCodeMirror.setValue(theFile.target.result);
//            } else {
//                myCodeMirror.setValue("GCode view is disabled. You can enable it in 'GCode analyzer options' section.")
//            }
    };

    /**
     * Returns whether this view is currently being hovered.
     *
     * @returns {boolean}
     */
    this.isHovered = function() {
        return root.is(":hover");
    }

    /**
     * Adjusts all other views to the perspective of this view.
     */
    this.adjustToThis = function() {
        renderer2d.adjustToThis();
    }

    /**
     * Returns true if the view has actually loaded a model.
     * @returns {boolean}
     */
    this.hasLoaded = function() {
        return gcode != null;
    }

    /**
     * Returns the loaded {@link GCODE.reader}
     * @returns {GCODE.reader}
     */
    this.getLoaded = function() {
        return gcode;
    }

    var __construct = function() {
        root.html(createViewHtml());
        init2d();
        init3d();
        initEventTriggers();
        gCodeChanged();
        updateGCodeSelectBox();
        snapshotService = new GCODE.snapshot(app, self);
    }();
    return this;
});