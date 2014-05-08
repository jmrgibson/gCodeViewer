/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */

GCODE.ui = (function(){
    var reader;
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