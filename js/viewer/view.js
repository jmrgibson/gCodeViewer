/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 03/30/14
 * Time: 5:54 PM
 */
GCODE.view = (function (domRoot) {

    /**
     * Holds the DOM root node of the view as jQuery selector
     *
     * @type {jQuery}
     */
    var root = $(domRoot);

    /**
     * Holds the GCode to be displayed in this view.
     * @type {GCODE.reader}
     */
    var gcode = null;

    /**
     * Holds the 2D GCode renderer
     * @type {GCODE.renderer}
     */
    var renderer2d = new GCODE.renderer();

    /**
     * Display type enum
     * @type {{speed: number, expermm: number, volpersec: number}}
     */
    var displayType = {speed: 1, expermm: 2, volpersec: 3};

    /**
     * The lines of GCode of the current layer
     *
     * @type {*}
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
     * Holds some underscore templates used to render the legends.
     * @type {{li: (template), colorBox: (template), colorBoxRetract: (template)}}
     */
    var templates = {
        li: _.template('\
            <li title="<%= tooltip %>" data-toggle="tooltip" data-placement="top">\
                <i class="fa fa-<%= icon %>"></i> <%= metric %>\
            </li>'),
        colorBox: _.template('\
            <div class="colorbox">\
                <div class="color" style="background-color: <%= color %>"></div>\
                <span><%= speed %></span>\
            </div>'),
        colorBoxRetract: _.template('\
            <div class="colorbox colorbox-rounded">\
                <div class="color" style="background-color: <%= retract %>"></div>\
                <div class="color" style="background-color: <%= restart %>"></div>\
                <span><%= speed %></span>\
            </div>')
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
                speed: (parseFloat(layerSpeed) / 60).toFixed(2) + " mm/s"
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
     * @param {integer} layerNum layer level to display
     */
    var printLayerInfo = function(layerNum) {
        var z = renderer2d.getZ(layerNum);
        var segments = renderer2d.getLayerNumSegments(layerNum);
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
            tooltip: "GCODE commands in layer",
            icon: "code",
            metric: segments
        });
        metrics += templates.li({
            tooltip: "Filament used by layer",
            icon: "dashboard",
            metric: filament.toFixed(2) + "mm"
        });
        metrics += templates.li({
            tooltip: "Print time for layer",
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
        if (renderOptions['speedDisplayType'] === displayType.speed) {
            exSpeed = prepareExPerSec(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] === displayType.expermm) {
            exSpeed = prepareExPerMMInfo(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] === displayType.volpersec) {
            exSpeed = prepareVolPerSecInfo(z, renderOptions);
        }
        root.find(".layer-info .extrudeSpeeds").html(_toHtml(exSpeed, templates.colorBox));

        // move speeds
        var moveSpeed = prepareMoveSpeeds(z, renderOptions);
        root.find(".layer-info .moveSpeeds").html(_toHtml(moveSpeed, templates.colorBox));

        // retract speeds
        var retractSpeed = prepareRetractSpeeds(z, renderOptions);
        root.find(".layer-info .retractSpeeds").html(_toHtml(retractSpeed, templates.colorBoxRetract));
    };

    /**
     * Update line colors in GCode viewer to highlight GCode of current layer
     *
     * @param toggle
     */
    var setLinesColor = function(toggle){
        for(var i=gCodeLines.first;i<gCodeLines.last; i++){
            if(toggle){
                myCodeMirror.setLineClass(Number(i), null, "activeline");
            }else{
                myCodeMirror.setLineClass(Number(i), null, null);
            }
        }
    };

    /**
     * Initializes the sliders of the 2D render pane
     */
    var init2dEventHandlers = function() {
        // TODO: fix horizontal slider
        var handle;
        // sliderHor = $( "#slider-horizontal" );

        var onLayerChange = function(val){
            var progress = renderer2d.getLayerNumSegments(val) - 1;
            renderer2d.render(val, 0, progress);
            // sliderHor.slider({max: progress, values: [0,progress]});
            setLinesColor(false); //clear current selection
            // gCodeLines = GCODE.gCodeReader.getGCodeLines(val, sliderHor.slider("values",0), sliderHor.slider("values",1));
            gCodeLines = gcode.getGCodeLines(val, 0, 1);
            setLinesColor(true); // highlight lines
            printLayerInfo(val);
        };

        var maxLayer = renderer2d.getModelNumLayers() - 1;
        root.find(".layer-info .maxLayer").text(maxLayer);

        sliderVer.slider("destroy");
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
                onLayerChange(event.value);
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

        // function to go one layer up and adjusting the slider value
        var oneLayerUpIfPossible = function() {
            if (sliderVer.slider('getValue') < maxLayer) {
                sliderVer.slider('setValue', sliderVer.slider('getValue') + 1);
                onLayerChange(sliderVer.slider('getValue'));
            }
        }
        // function to go one layer down and adjusting the slider value
        var oneLayerDownIfPossible = function() {
            if (sliderVer.slider('getValue') > 0) {
                sliderVer.slider('setValue', sliderVer.slider('getValue') - 1);
                onLayerChange(sliderVer.slider('getValue'));
            }
        }

        // bind arrow keys to change layer
        window.onkeydown = function (event) {
            if (event.keyCode === 38 || event.keyCode === 33) {
                oneLayerUpIfPossible();
            } else if (event.keyCode === 40 || event.keyCode === 34) {
                oneLayerDownIfPossible();
            }
            return event.stopPropagation()
        }
        // bind slider control buttons to change layer
        root.find(".tab2d .scrollbar-plus").mousedown(oneLayerUpIfPossible);
        root.find(".tab2d .scrollbar-minus").mousedown(oneLayerDownIfPossible);
    };

    /**
     * Initializes the view and makes sure everything is ready.
     */
    var init = function () {

    }

    init();
    return {
        /**
         * Opens the 2D layer view in this view
         */
        "display2d": function () {
        },

        /**
         * Opens the 3D model in this view
         */
        "display3d": function () {
        },

        /**
         * Opens the GCode source in this view
         */
        "displaySource": function () {
        },

        /**
         * Loads a GCode into this view
         *
         * @param {GCODE.reader} reader
         */
        "load": function (reader) {
            gcode = reader;
        }
    }
});