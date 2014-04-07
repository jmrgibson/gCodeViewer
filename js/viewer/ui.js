/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */

var GCODE = {};

GCODE.ui = (function(){
    var reader;
    var myCodeMirror;
    var sliderVer;
    var sliderHor;
    var gCodeLines = {first: 0, last: 0};
    var showGCode = false;
    var displayType = {speed: 1, expermm: 2, volpersec: 3};

    // _templates
    var liHtml = '<li title="<%= tooltip %>" data-toggle="tooltip" data-placement="top">';
    liHtml += '<i class="fa fa-<%= icon %>"></i> <%= metric %>';
    liHtml += '</li>';
    var li = _.template(liHtml);

//    var worker;

    var setProgress = function(id, progress){
        $('#'+id).width(parseInt(progress)+'%').text(parseInt(progress)+'%');
//        $('#'+id);
    };

    var chooseAccordion = function(id){
//        debugger;
        $('#'+id).collapse("show");
    };

    var setLinesColor = function(toggle){
        for(var i=gCodeLines.first;i<gCodeLines.last; i++){
            if(toggle){
                myCodeMirror.setLineClass(Number(i), null, "activeline");
            }else{
                myCodeMirror.setLineClass(Number(i), null, null);
            }
        }
    };

    var prepareMoveSpeeds = function(z, renderOptions) {
        var layerSpeeds = GCODE.gCodeReader.getModelInfo().speedsByLayer;
        var colorLen = renderOptions['colorLineLen'];
        var speedIndex = 0;
        var output = [];

        if (typeof(layerSpeeds['move'][z]) === 'undefined') {
            return output;
        }
        for (var i = 0; i < layerSpeeds['move'][z].length; i++) {
            if (typeof(layerSpeeds['move'][z][i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push({
                color: renderOptions['colorMove'],
                speed: (parseFloat(layerSpeeds['move'][z][i]) / 60).toFixed(2) + "mm/s"
            });
        }
        return output;
    }

    var prepareRetractSpeeds = function (z, renderOptions) {
        var layerSpeeds = GCODE.gCodeReader.getModelInfo().speedsByLayer;
        var colorLen = renderOptions['colorLineLen'];
        var speedIndex = 0;
        var output = [];

        if (typeof(layerSpeeds['retract'][z]) === 'undefined') {
            return output;
        }
        for (var i = 0; i < layerSpeeds['retract'][z].length; i++) {
            if (typeof(layerSpeeds['retract'][z][i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push({
                retract: renderOptions['colorRetract'],
                restart: renderOptions['colorRestart'],
                speed: (parseFloat(layerSpeeds['retract'][z][i]) / 60).toFixed(2) + "mm/s"
            });
        }
        return output;
    }

    var prepareExPerSec = function (z, renderOptions) {
        var layerSpeeds = GCODE.gCodeReader.getModelInfo().speedsByLayer;
        var colors = renderOptions["colorLine"];
        var colorLen = renderOptions['colorLineLen'];
        var speedIndex = 0;
        var output = [];

        for (var i = 0; i < layerSpeeds['extrude'][z].length; i++) {
            if (typeof(layerSpeeds['extrude'][z][i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push({
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeeds['extrude'][z][i]) / 60).toFixed(2) + "mm/s"
            });
        }
        return output;
    }

    var prepareExPerMMInfo = function (z, renderOptions) {
        var layerSpeeds = GCODE.gCodeReader.getModelInfo().volSpeedsByLayer;
        var colors = renderOptions["colorLine"];
        var colorLen = renderOptions['colorLineLen'];
        var speedIndex = 0;
        var output = [];

        for (var i = 0; i < layerSpeeds[z].length; i++) {
            if (typeof(layerSpeeds[z][i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push({
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeeds[z][i])).toFixed(3) + "mm/mm"
            });
        }
        return output;
    }

    var prepareVolPerSecInfo = function (z, renderOptions) {
        var layerSpeeds = GCODE.gCodeReader.getModelInfo().extrusionSpeedsByLayer;
        var gCodeOptions = GCODE.gCodeReader.getOptions();
        var colors = renderOptions["colorLine"];
        var colorLen = renderOptions['colorLineLen'];
        var speedIndex = 0;
        var output = [];

        for (var i = 0; i < layerSpeeds[z].length; i++) {
            if (typeof(layerSpeeds[z][i]) === 'undefined') {
                continue;
            }
            speedIndex = i;
            if (speedIndex > colorLen - 1) {
                speedIndex = speedIndex % (colorLen - 1);
            }
            output.push({
                color: colors[speedIndex],
                speed: (parseFloat(layerSpeeds[z][i] * 3.141 * gCodeOptions['filamentDia'] / 10 * gCodeOptions['filamentDia'] / 10 / 4)).toFixed(3) + "mm^3/sec"
            });
        }
        return output;
    }


    var printLayerInfo = function(layerNum){
        var z = GCODE.renderer.getZ(layerNum);
        var segments = GCODE.renderer.getLayerNumSegments(layerNum);
        var renderOptions = GCODE.renderer.getOptions();
        var filament = GCODE.gCodeReader.getLayerFilament(z);
        var output = [];

        // current layer
        $("#layer-info .curLayer").text(layerNum);

        // layer metrics
        var metrics = "";
        metrics += li({
            tooltip: "Layer height",
            icon: "arrows-v",
            metric: z + "mm"
        });
        metrics += li({
            tooltip: "GCODE commands in layer",
            icon: "code",
            metric: segments
        });
        metrics += li({
            tooltip: "Filament used by layer",
            icon: "dashboard",
            metric: filament.toFixed(2) + "mm"
        });
        metrics += li({
            tooltip: "Print time for layer",
            icon: "clock-o",
            metric: parseFloat(GCODE.gCodeReader.getModelInfo().printTimeByLayer[z]).toFixed(1) + "sec"
        });
        $("#layer-info .metrics").html(metrics).find("li").tooltip();

        // common speed preparation dependencies and templates
        var z = GCODE.renderer.getZ(layerNum);
        var renderOptions = GCODE.renderer.getOptions();
        var colorBox = _.template('<div class="colorbox"><div class="color" style="background-color: <%= color %>"></div><span><%= speed %></span></div>');

        // extrusion speeds
        var exSpeed;
        if (renderOptions['speedDisplayType'] === displayType.speed) {
            exSpeed = prepareExPerSec(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] === displayType.expermm) {
            exSpeed = prepareExPerMMInfo(z, renderOptions);
        } else if (renderOptions['speedDisplayType'] === displayType.volpersec) {
            exSpeed = prepareVolPerSecInfo(z, renderOptions);
        }
        var exSpeedHtml = "";
        exSpeed = _.sortBy(exSpeed, function(el) {
            return el.speed;
        });
        _.each(exSpeed, function(el) {
            exSpeedHtml += colorBox(el);
        });
        $("#layer-info .extrudeSpeeds").html(exSpeedHtml);

        // move speeds
        var moveSpeed = prepareMoveSpeeds(z, renderOptions);
        var moveSpeedHtml = "";
        moveSpeed = _.sortBy(moveSpeed, function(el) {
            return el.speed;
        });
        _.each(moveSpeed, function(el) {
            moveSpeedHtml += colorBox(el);
        });
        $("#layer-info .moveSpeeds").html(moveSpeedHtml);

        // retract speeds
        var colorBoxRetract = _.template('<div class="colorbox colorbox-rounded"><div class="color" style="background-color: <%= retract %>"></div><div class="color" style="background-color: <%= restart %>"></div><span><%= speed %></span></div>');
        var retractSpeed = prepareRetractSpeeds(z, renderOptions);
        console.log(retractSpeed);
        var retractSpeedHtml = "";
        retractSpeed = _.sortBy(retractSpeed, function(el) {
            return el.speed;
        });
        _.each(retractSpeed, function(el) {
            retractSpeedHtml += colorBoxRetract(el);
        });
        $("#layer-info .retractSpeeds").html(retractSpeedHtml);

        $('#layerInfo').html(output.join('<br>'));
//        chooseAccordion('layerAccordionTab');
    };

    var printModelInfo = function(){
        // get model info
        var modelInfo = GCODE.gCodeReader.getModelInfo();

        // compile metrics
        var metricsHtml = "";
        metricsHtml += li({
            "tooltip": "Model size",
            "icon": "arrows",
            "metric": modelInfo.modelSize.x.toFixed(2) + ' x ' + modelInfo.modelSize.y.toFixed(2) + ' x ' + modelInfo.modelSize.z.toFixed(2) + ' mm'
        });
        metricsHtml += li({
            "tooltip": "Total filament used",
            "icon": "arrows-h",
            "metric": modelInfo.totalFilament.toFixed(2) + "mm"
        });
        if(modelInfo.filamentByExtruder.length > 1){
            for(var key in modelInfo.filamentByExtruder){

                metricsHtml += li({
                    "tooltip": "Filament for extruder '" + key + "'",
                    "icon": "arrows-h",
                    "metric": modelInfo.filamentByExtruder[key].toFixed(2) + "mm"
                });
            }
        }
        metricsHtml += li({
            "tooltip": "Total filament weight used",
            "icon": "dashboard",
            "metric": modelInfo.totalWeight.toFixed(2) + "grams"
        });
        metricsHtml += li({
            "tooltip": "Estimated print time",
            "icon": "clock-o",
            "metric": parseInt(parseFloat(modelInfo.printTime) / 60 / 60) + ":" + parseInt((parseFloat(modelInfo.printTime) / 60) % 60) + ":" + parseInt(parseFloat(modelInfo.printTime) % 60)
        });
        metricsHtml += li({
            "tooltip": "Estimated layer height",
            "icon": "arrows-v",
            "metric": modelInfo.layerHeight.toFixed(2) + "mm"
        });
        metricsHtml += li({
            "tooltip": "Layer count",
            "icon": "bars",
            "metric": modelInfo.layerCnt.toFixed(0) + "printed, " + modelInfo.layerTotal.toFixed(0) + 'visited'
        });

        // display metrics and add event listeners for tooltips
        $("#metrics-list").html(metricsHtml).find("li").tooltip();
    };

    var handleFileSelect = function(evt) {
//        console.log("handleFileSelect");
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer?evt.dataTransfer.files:evt.target.files; // FileList object.

        var output = [];
        for (var i = 0, f; f = files[i]; i++) {
            if(f.name.toLowerCase().match(/^.*\.(?:gcode|g|txt|gco)$/)){
                output.push('<li>File extensions suggests GCODE</li>');
            }else{
                output.push('<li><strong>You should only upload *.gcode files! I will not work with this one!</strong></li>');
                document.getElementById('errorList').innerHTML = '<ul>' + output.join('') + '</ul>';
                return;
            }

            reader = new FileReader();
            reader.onload = function(theFile){
                chooseAccordion('progressAccordionTab');
                setProgress('loadProgress', 0);
                setProgress('analyzeProgress', 0);
//                myCodeMirror.setValue(theFile.target.result);
                GCODE.gCodeReader.loadFile(theFile);
                if(showGCode){
                    myCodeMirror.setValue(theFile.target.result);
                }else{
                    myCodeMirror.setValue("GCode view is disabled. You can enable it in 'GCode analyzer options' section.")
                }

            };
            reader.readAsText(f);
        }
    };

    var handleDragOver = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.target.dropEffect = 'copy'; // Explicitly show this is a copy.
    };

    var initSliders = function(){
        // TODO: fix horizontal slider
        var handle;
        // sliderHor = $( "#slider-horizontal" );

        var onLayerChange = function(val){
            var progress = GCODE.renderer.getLayerNumSegments(val)-1;
            GCODE.renderer.render(val,0, progress);
            // sliderHor.slider({max: progress, values: [0,progress]});
            setLinesColor(false); //clear current selection
            // gCodeLines = GCODE.gCodeReader.getGCodeLines(val, sliderHor.slider("values",0), sliderHor.slider("values",1));
            gCodeLines = GCODE.gCodeReader.getGCodeLines(val, 0, 1);
            setLinesColor(true); // highlight lines
            printLayerInfo(val);
        };

        var maxLayer = GCODE.renderer.getModelNumLayers() - 1;
        $("#layer-info .maxLayer").text(maxLayer);

        sliderVer.slider("destroy");
        sliderVer = $("#layer-scrollbar");
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
        $("#tab2d .scrollbar-plus").mousedown(oneLayerUpIfPossible);
        $("#tab2d .scrollbar-minus").mousedown(oneLayerDownIfPossible);
    };

    var processMessage = function(e){
        var data = e.data;
        switch (data.cmd) {
            case 'returnModel':
                setProgress('loadProgress', 100);
                GCODE.ui.worker.postMessage({
                        "cmd":"analyzeModel",
                        "msg":{
                        }
                    }
                );
                break;
            case 'analyzeDone':
//                var resultSet = [];

                setProgress('analyzeProgress',100);
                GCODE.gCodeReader.processAnalyzeModelDone(data.msg);
                GCODE.gCodeReader.passDataToRenderer();
                initSliders();
                printModelInfo();
                printLayerInfo(0);
                chooseAccordion('infoAccordionTab');
                GCODE.ui.updateOptions();
                $('#tab-nav').find('a[href="#tab2d"]').click();
                $('#runAnalysisButton').removeClass('disabled');
                $("#layer-info").show();
                break;
            case 'returnLayer':
                GCODE.gCodeReader.processLayerFromWorker(data.msg);
                setProgress('loadProgress',data.msg.progress);
                break;
            case 'returnMultiLayer':
                GCODE.gCodeReader.processMultiLayerFromWorker(data.msg);
                setProgress('loadProgress',data.msg.progress);
                break;
            case "analyzeProgress":
                setProgress('analyzeProgress',data.msg.progress);
                break;
            default:
                console.log("default msg received" + data.cmd);
        }
    };

    var checkCapabilities = function(){
        var warnings = [];
        var fatal = [];

        Modernizr.addTest('filereader', function () {
            return !!(window.File && window.FileList && window.FileReader);
        });

        if(!Modernizr.canvas)fatal.push("<li>Your browser doesn't seem to support HTML5 Canvas, this application won't work without it.</li>");
        if(!Modernizr.filereader)fatal.push("<li>Your browser doesn't seem to support HTML5 File API, this application won't work without it.</li>");
        if(!Modernizr.webworkers)fatal.push("<li>Your browser doesn't seem to support HTML5 Web Workers, this application won't work without it.</li>");
        if(!Modernizr.svg)fatal.push("<li>Your browser doesn't seem to support HTML5 SVG, this application won't work without it.</li>");

        if(fatal.length>0){
            document.getElementById('errorList').innerHTML = '<ul>' + fatal.join('') + '</ul>';
            console.log("Initialization failed: unsupported browser.");
            return false;
        }

        if(!Modernizr.webgl){
            warnings.push("<li>Your browser doesn't seem to support HTML5 Web GL, 3d mode is not recommended, going to be SLOW!</li>");
            GCODE.renderer3d.setOption({rendererType: "canvas"});
        }
        if(!Modernizr.draganddrop)warnings.push("<li>Your browser doesn't seem to support HTML5 Drag'n'Drop, Drop area will not work.</li>");

        if(warnings.length>0){
            document.getElementById('errorList').innerHTML = '<ul>' + warnings.join('') + '</ul>';
            console.log("Initialization succeeded with warnings.")
        }
        return true;
    };


    return {
        worker: undefined,
        initHandlers: function(){
            // check browser requirements
            var capabilitiesResult = checkCapabilities();
            if(!capabilitiesResult){
                return;
            }

            // initialize GCode drag&drop
            var dropZone = document.getElementById('drop_zone');
            dropZone.addEventListener('dragover', handleDragOver, false);
            dropZone.addEventListener('drop', handleFileSelect, false);
            document.getElementById('file').addEventListener('change', handleFileSelect, false);

            // initialize progress bars
            setProgress('loadProgress', 0);
            setProgress('analyzeProgress', 0);

            // initilize 2d preview slider
            sliderVer = $("#layer-scrollbar");
            sliderVer.slider({
                reversed : true,
                orientation: "vertical",
                tooltip: "hide",
                min: 0,
                max: 1,
                step: 1,
                value: 0,
                enabled: false
            });

            // initialize navigation listeners
            $('#tab-nav').find('a[href="#tab3d"]').click(function (e) {
                e.preventDefault();
                console.log("Switching to 3d mode");
                $(this).tab('show');
                GCODE.renderer3d.doRender();
            });
            $('#tab-nav').find('a[href="#tabGCode"]').click(function (e) {
                e.preventDefault();
                console.log("Switching to GCode preview mode");
                $(this).tab('show');
                myCodeMirror.refresh();
                console.log(gCodeLines);
                myCodeMirror.setCursor(Number(gCodeLines.first),0);
//                myCodeMirror.setSelection({line:Number(gCodeLines.first),ch:0},{line:Number(gCodeLines.last),ch:0});
                myCodeMirror.focus();
            });

            // initialize worker
            this.worker = new Worker('js/Worker.js');
            this.worker.addEventListener('message', processMessage, false);

            // initial rendering to display grid
            GCODE.ui.processOptions();
            GCODE.renderer.render(0,0);

            console.log("Application initialized");

            // codemirror
            myCodeMirror = new CodeMirror( document.getElementById('gCodeContainer'), {
                lineNumbers: true,
                gutters: ['CodeMirror-linenumbers']
            });
            myCodeMirror.setSize("100%","100%");
            chooseAccordion('fileAccordionTab');

            (function() {
                var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
                window.requestAnimationFrame = requestAnimationFrame;
            })();

            if(window.location.search.match(/new/)){
                $('#errAnalyseTab').removeClass('hide');
            }

            // react to browser resize
            var resizeTimeout = null;
            $(window).resize(function() {
                if (resizeTimeout !== null) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = window.setTimeout(function() {
                    $('#tab-nav .active.clickOnResize a').click();
                }, 300);
            });

        },

        processOptions: function(){
            if(document.getElementById('sortLayersCheckbox').checked)GCODE.gCodeReader.setOption({sortLayers: true});
            else GCODE.gCodeReader.setOption({sortLayers: false});

            if(document.getElementById('purgeEmptyLayersCheckbox').checked)GCODE.gCodeReader.setOption({purgeEmptyLayers: true});
            else GCODE.gCodeReader.setOption({purgeEmptyLayers: false});

            showGCode = document.getElementById('showGCodeCheckbox').checked;

            if(document.getElementById('moveModelCheckbox').checked)GCODE.renderer.setOption({moveModel: true});
            else GCODE.renderer.setOption({moveModel: false});

            if(document.getElementById('showMovesCheckbox').checked)GCODE.renderer.setOption({showMoves: true});
            else GCODE.renderer.setOption({showMoves: false});

            if(document.getElementById('showRetractsCheckbox').checked)GCODE.renderer.setOption({showRetracts: true});
            else GCODE.renderer.setOption({showRetracts: false});

            if(document.getElementById('differentiateColorsCheckbox').checked)GCODE.renderer.setOption({differentiateColors: true});
            else GCODE.renderer.setOption({differentiateColors: false});

            if(document.getElementById('thickExtrusionCheckbox').checked)GCODE.renderer.setOption({actualWidth: true});
            else GCODE.renderer.setOption({actualWidth: false});

            if(document.getElementById('alphaCheckbox').checked)GCODE.renderer.setOption({alpha: true});
            else GCODE.renderer.setOption({alpha: false});

            if(document.getElementById('showNextLayer').checked)GCODE.renderer.setOption({showNextLayer: true});
            else GCODE.renderer.setOption({showNextLayer: false});

            if(document.getElementById('renderErrors').checked){
                GCODE.renderer.setOption({showMoves: false});
                GCODE.renderer.setOption({showRetracts: false});
                GCODE.renderer.setOption({renderAnalysis: true});
                GCODE.renderer.setOption({actualWidth: true});
            }
            else GCODE.renderer.setOption({renderAnalysis: false});

            var filamentDia = 1.75;
            if(Number($('#filamentDia').attr('value'))) {filamentDia = Number($('#filamentDia').attr('value'));}
            GCODE.gCodeReader.setOption({filamentDia: filamentDia});

            var nozzleDia = 0.4;
            if(Number($('#nozzleDia').attr('value'))) {nozzleDia = Number($('#nozzleDia').attr('value'));}
            GCODE.gCodeReader.setOption({nozzleDia: nozzleDia});

            if(document.getElementById('plasticABS').checked)GCODE.gCodeReader.setOption({filamentType: "ABS"});
            if(document.getElementById('plasticPLA').checked)GCODE.gCodeReader.setOption({filamentType: "PLA"});

            if(document.getElementById('speedDisplayRadio').checked)GCODE.renderer.setOption({speedDisplayType: displayType.speed});
            if(document.getElementById('exPerMMRadio').checked)GCODE.renderer.setOption({speedDisplayType: displayType.expermm});
            if(document.getElementById('volPerSecRadio').checked)GCODE.renderer.setOption({speedDisplayType: displayType.volpersec});

        },

        updateOptions: function(){
            var gcodeOptions = GCODE.gCodeReader.getOptions();

            document.getElementById('nozzleDia').value = gcodeOptions['nozzleDia'];
            document.getElementById('filamentDia').value = gcodeOptions['filamentDia'];
        },

        resetSliders: function(){
            initSliders();
        },

        setOption: function(options){
            for(var opt in options){
                uiOptions[opt] = options[opt];
            }
        }
    }
});