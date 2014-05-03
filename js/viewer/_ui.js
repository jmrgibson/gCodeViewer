/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */

GCODE.ui = (function(){
    var reader;
    var myCodeMirror;
    var showGCode = false;

//    var worker;

    var chooseAccordion = function(id){
//        debugger;
        $('#'+id).collapse("show");
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



    return {
        initHandlers: function(){
            // check browser requirements
            var capabilitiesResult = checkCapabilities();
            if(!capabilitiesResult){
                return;
            }



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