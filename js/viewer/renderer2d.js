/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/20/12
 * Time: 1:36 PM
 * To change this template use File | Settings | File Templates.
 */


GCODE.renderer = (function(canvasRoot, config, bindToView, eventManager){
// ***** PRIVATE ******

    /**
     * Holds the view the renderer is bound to.
     * @type {GCODE.view}
     */
    var view = bindToView;

    /**
     * Holds the GCode app event manager
     *
     * @type {GCODE.events}
     */
    var events = eventManager;

    /**
     * Reader of the currently loaded GCode.
     * @type {GCODE.reader}
     */
    var curReader;

    var canvas;
    var ctx;
    var zoomFactor= 3, zoomFactorDelta = 0.4;
    var gridSizeX=200,gridSizeY=200,gridStep=10;
    var ctxHeight, ctxWidth;
    var prevX=0, prevY=0;

//    var colorGrid="#bbbbbb", colorLine="#000000";
    var sliderHor, sliderVer;
    var absZoom = 0;
    var layerNumStore, progressStore={from: 0, to: -1};
    var lastX, lastY;
    var dragStart,dragged;
    var scaleFactor = 1.1;
    var model;
    var initialized=false;
    var displayType = {speed: 1, expermm: 2, volpersec: 3};
    var renderOptions = {
        showMoves: true, // TODO: remove
        showRetracts: true, // TODO: remove
        colorGrid: "#bbbbbb",
        extrusionWidth: 1,
//        colorLine: ["#000000", "#aabb88",  "#ffe7a0", "#6e7700", "#331a00", "#44ba97", "#08262f", "#db0e00", "#ff9977"],
        colorLine: ["#000000", "#45c7ba",  "#a9533a", "#ff44cc", "#dd1177", "#eeee22", "#ffbb55", "#ff5511", "#777788", "#ff0000", "#ffff00"],
        colorLineLen: 9,
        colorMove: "#00ff00",
        colorRetract: "#ff0000",
        colorRestart: "#0000ff",
        sizeRetractSpot: 2,
        modelCenter: {x: 0, y: 0},
        moveModel: true, // TODO: remove
        differentiateColors: true, // TODO: remove
        showNextLayer: false, // TODO: remove
        alpha: false, // TODO: remove
        actualWidth: false, // TODO: remove
        renderErrors: false,
        renderAnalysis: false, // TODO: remove
        speedDisplayType: displayType.speed // TODO: remove
    };

    var offsetModelX=0, offsetModelY=0;
    var speeds = [];
    var speedsByLayer = {};
    var volSpeeds = [];
    var volSpeedsByLayer = {};
    var extrusionSpeeds = [];
    var extrusionSpeedsByLayer = {};

    /**
     * Rerenders the canvas.
     *
     * @param {integer} layerNum layer to render
     * @param {double} fromProgress
     * @param {double} toProgress
     */
    var reRender = function(layerNum, fromProgress, toProgress) {
        // fetch args from store if none are passed
        if (null ==layerNum) {
            layerNum = layerNumStore;
        }
        if (null == fromProgress) {
            fromProgress = progressStore.from;
        }
        if (null == toProgress) {
            toProgress = progressStore.to;
        }

        // clear canvas
        var p1 = ctx.transformedPoint(0, 0);
        var p2 = ctx.transformedPoint(canvas[0].width, canvas[0].height);
        ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

        // if no model is present, just draw a grid
        if (!model) {
            drawGrid();
            return;
        }

        // check if layer is in bounds
        if (layerNum >= model.length) {
            console.log("Got request to render non-existent layer!!");
            return;
        }

        // draw grid with model
        var gCodeOpts = curReader.getOptions();
        drawGrid();
        if (renderOptions['alpha']) {
            ctx.globalAlpha = 0.6;
        } else {
            ctx.globalAlpha = 1;
        }
        if (renderOptions['actualWidth']) {
            renderOptions['extrusionWidth'] = gCodeOpts['filamentDia'] * gCodeOpts['wh'] / zoomFactor;
        } else {
            renderOptions['extrusionWidth'] = gCodeOpts['filamentDia'] * gCodeOpts['wh'] / zoomFactor / 2;
        }
        if (renderOptions['showNextLayer'] && layerNum < model.length - 1) {
            drawLayer(layerNum + 1, 0, curReader.getLayerNumSegments(layerNum + 1), true);
        }
        drawLayer(layerNum, fromProgress, toProgress);
    };

    /**
     * Listener for config changed events to update the local configuration
     */
    var updateLocalConfig = function() {
        var options = config.getOptions();
        for (var key in  options) {
            renderOptions[key] = options[key];
        };
        reRender();
    };

    function trackTransforms(ctx){
        var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
        var xform = svg.createSVGMatrix();
        ctx.getTransform = function(){ return xform; };

        var savedTransforms = [];
        var save = ctx.save;
        ctx.save = function(){
            savedTransforms.push(xform.translate(0,0));
            return save.call(ctx);
        };
        var restore = ctx.restore;
        ctx.restore = function(){
            xform = savedTransforms.pop();
            return restore.call(ctx);
        };

        var scale = ctx.scale;
        ctx.scale = function(sx,sy){
            xform = xform.scaleNonUniform(sx,sy);
            return scale.call(ctx,sx,sy);
        };
        var rotate = ctx.rotate;
        ctx.rotate = function(radians){
            xform = xform.rotate(radians*180/Math.PI);
            return rotate.call(ctx,radians);
        };
        var translate = ctx.translate;
        ctx.translate = function(dx,dy){
            xform = xform.translate(dx,dy);
            return translate.call(ctx,dx,dy);
        };
        var transform = ctx.transform;
        ctx.transform = function(a,b,c,d,e,f){
            var m2 = svg.createSVGMatrix();
            m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
            xform = xform.multiply(m2);
            return transform.call(ctx,a,b,c,d,e,f);
        };
        var setTransform = ctx.setTransform;
        ctx.setTransform = function(a,b,c,d,e,f){
            xform.a = a;
            xform.b = b;
            xform.c = c;
            xform.d = d;
            xform.e = e;
            xform.f = f;
            return setTransform.call(ctx,a,b,c,d,e,f);
        };
        var pt  = svg.createSVGPoint();
        ctx.transformedPoint = function(x,y){
            pt.x=x; pt.y=y;
            return pt.matrixTransform(xform.inverse());
        }
    }

    /**
     * Only forwards events if current renderer is affected.
     *
     * @param {Function} handler to forward event to
     * @param {Function} additionalPredicate if you need additional checks
     * @returns {Function}
     * @private
     */
    var _affected = function (handler, additionalPredicate) {
        return function (viewName, evt) {
            if (viewName == view.getName() || true === config.synced.get()
                || (additionalPredicate != undefined && additionalPredicate(viewName, evt))) {
                handler(viewName, evt);
            }
        }
    }

    // mouseDown event handler
    events.view.renderer2d.mouseDown.add(_affected(function (viewName, evt) {
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || (evt.pageX - canvas[0].offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas[0].offsetTop);
        dragStart = ctx.transformedPoint(lastX, lastY);
        dragged = false;
    }));

    // mouseMove event handler
    events.view.renderer2d.mouseMove.add(_affected(function (viewName, evt) {
        lastX = evt.offsetX || (evt.pageX - canvas[0].offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas[0].offsetTop);
        dragged = true;
        if (dragStart) {
            var pt = ctx.transformedPoint(lastX, lastY);
            ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            reRender();
        }
    }));

    // mouseUp event handler
    events.view.renderer2d.mouseUp.add(_affected(function (viewName, evt) {
        dragStart = null;
        if (!dragged) {
            zoom(evt.shiftKey ? -1 : 1);
        }
    }));

    // scroll event handler
    var zoom = function (clicks) {
        absZoom += clicks;
        var pt = ctx.transformedPoint(lastX, lastY);
        ctx.translate(pt.x, pt.y);
        var factor = Math.pow(scaleFactor, clicks);
        ctx.scale(factor, factor);
        ctx.translate(-pt.x, -pt.y);
        reRender();
    };
    events.view.renderer2d.scroll.add(_affected(function (viewName, evt) {
        var delta;
        if (evt.detail < 0 || evt.wheelDelta > 0) {
            delta = zoomFactorDelta;
        } else {
            delta = -1 * zoomFactorDelta;
        }
        if (delta) {
            zoom(delta);
        }
        return evt.preventDefault() && false;
    }, function() {
        return true === config.diff.get()
    }));

    events.view.renderer2d.adjust.add(function(viewName, newAbsZoom, offsetX, offsetY) {
        if (viewName == view.getName()) {
            return;
        }
        zoom(newAbsZoom - absZoom);
        if (offsetX != undefined && offsetY != undefined) {
            var origin = ctx.transformedPoint(0, 0);
            ctx.translate(origin.x,  origin.y);
            ctx.translate(offsetX,  offsetY);
        }
        reRender();
    });


    /**
     * Initialize canvas and bind event handlers.
     */
    var startCanvas = function() {
        if (!canvas[0].getContext) {
            throw "exception";
        }

        canvas.attr("width", view.getWidth());
        canvas.attr("height", view.getHeight());

        ctx = canvas[0].getContext('2d'); // Получаем 2D контекст
        ctxHeight = canvas[0].height;
        ctxWidth = canvas[0].width;
        lastX = ctxWidth/2;
        lastY = ctxHeight/2;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        trackTransforms(ctx);

        /**
         * Returns a function that when invoked dispatches the given signal with the given event and the bound to views name.
         *
         * Can be used to bind to any event listener.
         *
         * @param {signals.Signal} signal
         * @returns {Function}
         */
        var sendSignal = function(signal) {
            return function(evt) {
                signal.dispatch(view.getName(), evt);
            };
        }

        canvas[0].addEventListener('mousedown', sendSignal(events.view.renderer2d.mouseDown), false);
        canvas[0].addEventListener('mousemove', sendSignal(events.view.renderer2d.mouseMove), false);
        canvas[0].addEventListener('mouseup', sendSignal(events.view.renderer2d.mouseUp), false);
        canvas[0].addEventListener('DOMMouseScroll', sendSignal(events.view.renderer2d.scroll), false);
        canvas[0].addEventListener('mousewheel', sendSignal(events.view.renderer2d.scroll), false);
    };

    var drawGrid = function() {
        if (!renderOptions["drawGrid"]) {
            return;
        }
        var i;
        ctx.strokeStyle = renderOptions["colorGrid"];
        ctx.lineWidth = 1;
        var offsetX=0, offsetY=0;
        if(renderOptions["moveModel"]){
            offsetX = offsetModelX;
            offsetY = offsetModelY;
        }

        ctx.beginPath();
        for(i=0;i<=gridSizeX;i+=gridStep){
            ctx.moveTo(i*zoomFactor-offsetX, 0-offsetY);
            ctx.lineTo(i*zoomFactor-offsetX, -gridSizeY*zoomFactor-offsetY);
        }
        ctx.stroke();

        ctx.beginPath();
        for(i=0;i<=gridSizeY;i+=gridStep){
            ctx.moveTo(0-offsetX, -i*zoomFactor-offsetY);
            ctx.lineTo(gridSizeX*zoomFactor-offsetX, -i*zoomFactor-offsetY);
        }
        ctx.stroke();

    };

    var drawLayer = function(layerNum, fromProgress, toProgress, isNextLayer){
        var i, speedIndex= 0, prevZ = 0;
        isNextLayer = typeof isNextLayer !== 'undefined' ? isNextLayer : false;
        if(!isNextLayer){
            layerNumStore=layerNum;
            progressStore = {from: fromProgress, to: toProgress};
        }
        if(!model||!model[layerNum])return;

        var cmds = model[layerNum];
        var x, y;

//        if(toProgress === -1){
//            toProgress=cmds.length;
//        }

        if(fromProgress>0){
            prevX = cmds[fromProgress-1].x*zoomFactor;
            prevY = -cmds[fromProgress-1].y*zoomFactor;
        }else if(fromProgress===0 && layerNum==0){
            if(model[0]&&typeof(model[0].x) !== 'undefined' && typeof(model[0].y) !== 'undefined'){
                prevX = model[0].x*zoomFactor;
                prevY = -model[0].y*zoomFactor;
            }else {
                prevX = 0;
                prevY = 0;
            }
        }else if(typeof(cmds[0].prevX) !== 'undefined' && typeof(cmds[0].prevY) !== 'undefined'){
            prevX = cmds[0].prevX*zoomFactor;
            prevY = -cmds[0].prevY*zoomFactor;
        }else{
            if(model[layerNum-1]){
                prevX=undefined;
                prevY=undefined;
                for(i=model[layerNum-1].length-1;i>=0;i--){
                    if(typeof(prevX) === 'undefined' && model[layerNum-1][i].x!==undefined)prevX=model[layerNum-1][i].x*zoomFactor;
                    if(typeof(prevY) === 'undefined' && model[layerNum-1][i].y!==undefined)prevY=-model[layerNum-1][i].y*zoomFactor;
                }
                if(typeof(prevX) === 'undefined')prevX=0;
                if(typeof(prevY) === 'undefined')prevY=0;
            }else{
                prevX=0;
                prevY=0;
            }
        }

        prevZ = getZ(layerNum);

//        ctx.strokeStyle = renderOptions["colorLine"];
        for(i=fromProgress;i<=toProgress;i++){
            ctx.lineWidth = 1;

            if(typeof(cmds[i]) === 'undefined')continue;

            if(typeof(cmds[i].prevX) !== 'undefined' && typeof(cmds[i].prevY) !== 'undefined'){
                prevX = cmds[i].prevX*zoomFactor;
                prevY = -cmds[i].prevY*zoomFactor;
            }
//                console.log(cmds[i]);
            if(typeof(cmds[i].x)==='undefined'||isNaN(cmds[i].x))x=prevX/zoomFactor;
            else x = cmds[i].x;
            if(typeof(cmds[i].y) === 'undefined'||isNaN(cmds[i].y))y=prevY/zoomFactor;
            else y = -cmds[i].y;
            if(renderOptions["differentiateColors"]&&!renderOptions['showNextLayer']&&!renderOptions['renderAnalysis']){
//                if(speedsByLayer['extrude'][prevZ]){
                if(renderOptions['speedDisplayType'] === displayType.speed){
                    speedIndex = speeds['extrude'].indexOf(cmds[i].speed);
                }else if(renderOptions['speedDisplayType'] === displayType.expermm){
                    speedIndex = volSpeeds.indexOf(cmds[i].volPerMM);
                }else if(renderOptions['speedDisplayType'] === displayType.volpersec){
                    speedIndex = extrusionSpeeds.indexOf((cmds[i].volPerMM*cmds[i].speed).toFixed(3));
                }else{
                    speedIndex=0;
                }
//                    speedIndex = GCODE.ui.ArrayIndexOf(speedsByLayer['extrude'][prevZ], function(obj) {return obj.speed === cmds[i].speed;});
//                } else {
//                    speedIndex = -1;
//                }
                if(speedIndex === -1){
                    speedIndex = 0;
                }else if(speedIndex > renderOptions["colorLineLen"] -1){
                    speedIndex = speedIndex % (renderOptions["colorLineLen"]-1);
    //                console.log("Too much colors");
                }
            }else if(renderOptions['showNextLayer']&&isNextLayer){
                speedIndex=3;
            }else if(renderOptions['renderErrors']){
                if(cmds[i].errType === 2){
                    speedIndex=9;
//                    console.log("l: " + layerNum + " c: " + i);
                }else if(cmds[i].errType === 1){
                    speedIndex=10;
                }else{
                    speedIndex=0;
                }
            }else if(renderOptions['renderAnalysis']){
//                if(cmds[i].errType === 2){
//                    speedIndex=-1;
//                }else{
//                    speedIndex=0;
//                }
                if(layerNum !== 0)speedIndex = -1;
                else speedIndex=0;
            }else{
                speedIndex=0;
            }


            if(!cmds[i].extrude&&!cmds[i].noMove){
//                ctx.stroke();
                if(cmds[i].retract == -1){
                    if(renderOptions["showRetracts"]){

                        ctx.strokeStyle = renderOptions["colorRetract"];
                        ctx.fillStyle = renderOptions["colorRetract"];
                        ctx.beginPath();
                        ctx.arc(prevX, prevY, renderOptions["sizeRetractSpot"], 0, Math.PI*2, true);
                        ctx.stroke();
                        ctx.fill();
                    }
                }
                if(renderOptions["showMoves"]){
                    ctx.strokeStyle = renderOptions["colorMove"];
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x*zoomFactor,y*zoomFactor);
                    ctx.stroke();
                }
//                ctx.strokeStyle = renderOptions["colorLine"][0];
//                ctx.beginPath();
//                console.log("moveto: "+cmds[i].x+":"+cmds[i].y)
//                ctx.moveTo(cmds[i].x*zoomFactor,cmds[i].y*zoomFactor);
            }
            else if(cmds[i].extrude){
                if(cmds[i].retract==0){
                    if(speedIndex>=0){
                        ctx.strokeStyle = renderOptions["colorLine"][speedIndex];
                    }else if(speedIndex===-1){
                        var val = parseInt(cmds[i].errLevelB).toString(16);
//                        var val = '8A';
                        var crB = "#" + "00".substr(0,2-val.length) + val + '0000';
                        val = parseInt(cmds[i].errLevelE).toString(16);
                        var crE = "#" + "00".substr(0,2-val.length) + val + '0000';
//                        if(renderOptions['showMoves'])console.log(cr);
                        var gradient = ctx.createLinearGradient(prevX, prevY, x*zoomFactor,y*zoomFactor);
                        if(cmds[i].errType === 1){
                            var limit = (1-cmds[i].errDelimiter);
                            if (limit >= 0.99) limit = 0.99;
                            gradient.addColorStop(0, "#000000");
                            gradient.addColorStop(limit, "#000000");
                            gradient.addColorStop(limit+0.01, crE);
                            gradient.addColorStop(1, crE);
                        }else if(cmds[i].errType === 2){
                            gradient.addColorStop(0, crB);
                            var limit = cmds[i].errDelimiter;
                            if (limit >= 0.99) limit = 0.99;
                            gradient.addColorStop(limit, crB);
                            gradient.addColorStop(limit+0.01, "#000000");
                            gradient.addColorStop(1, "#000000");
                        }else{
                            gradient.addColorStop(0, crB);
                            gradient.addColorStop(1, crE);
                        }
                        ctx.strokeStyle = gradient;
                    }
                    ctx.lineWidth = renderOptions['extrusionWidth'];
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x*zoomFactor,y*zoomFactor);
                    ctx.stroke();
                }else {
                    if(renderOptions["showRetracts"]){
//                        ctx.stroke();
                        ctx.strokeStyle = renderOptions["colorRestart"];
                        ctx.fillStyle = renderOptions["colorRestart"];
                        ctx.beginPath();
                        ctx.arc(prevX, prevY, renderOptions["sizeRetractSpot"], 0, Math.PI*2, true);
                        ctx.stroke();
                        ctx.fill();
//                        ctx.strokeStyle = renderOptions["colorLine"][0];
//                        ctx.beginPath();
                    }
                }
            }
            prevX = x*zoomFactor;
            prevY = y*zoomFactor;
        }
        ctx.stroke();
    };

// ***** PUBLIC *******
    this.getOptions = function(){
        return renderOptions;
    };
    this.debugGetModel = function(){
        return model;
    };
    this.render = function(layerNum, fromProgress, toProgress){
        reRender(layerNum, fromProgress, toProgress);
    };

    /**
     * Resizes the canvas to the actual view width.
     */
    this.resizeCanvas = function() {
        if (!canvas[0].getContext) {
            throw "exception";
        }
        canvas.attr("width", view.getWidth());
        canvas.attr("height", view.getHeight());
        ctx = canvas[0].getContext('2d');
        ctxHeight = canvas[0].height;
        ctxWidth = canvas[0].width;
        lastX = ctxWidth / 2;
        lastY = ctxHeight / 2;
        trackTransforms(ctx);
        ctx.translate((canvas[0].width - gridSizeX*zoomFactor)/2,gridSizeY*zoomFactor+(canvas[0].height - gridSizeY*zoomFactor)/2);
        reRender();
    }

    /**
     * Loads the GCode reader
     * @param {GCODE.reader} reader
     */
    this.load = function(reader){
        curReader = reader;
        var mdlInfo;
        model = reader.getModel();
        prevX=0;
        prevY=0;
        if(!initialized)this.init();

        mdlInfo = reader.getModelInfo();
        speeds = mdlInfo.speeds;
        speedsByLayer = mdlInfo.speedsByLayer;
        volSpeeds = mdlInfo.volSpeeds;
        volSpeedsByLayer = mdlInfo.volSpeedsByLayer;
        extrusionSpeeds = mdlInfo.extrusionSpeeds;
        extrusionSpeedsByLayer = mdlInfo.extrusionSpeedsByLayer;
//            console.log(speeds);
//            console.log(mdlInfo.min.x + ' ' + mdlInfo.modelSize.x);
        offsetModelX = (gridSizeX/2-(mdlInfo.min.x+mdlInfo.modelSize.x/2))*zoomFactor;
        offsetModelY = (mdlInfo.min.y+mdlInfo.modelSize.y/2)*zoomFactor-gridSizeY/2*zoomFactor;
        if(ctx)ctx.translate(offsetModelX, offsetModelY);
        var scaleF = mdlInfo.modelSize.x>mdlInfo.modelSize.y?(canvas[0].width)/mdlInfo.modelSize.x/zoomFactor:(canvas[0].height)/mdlInfo.modelSize.y/zoomFactor;
        var pt = ctx.transformedPoint(canvas[0].width/2,canvas[0].height/2);
        var transform = ctx.getTransform();
        var sX = scaleF/transform.a, sY = scaleF/transform.d;
        ctx.translate(pt.x,pt.y);
        ctx.scale(0.98*sX,0.98*sY);
        ctx.translate(-pt.x,-pt.y);
//            ctx.scale(scaleF,scaleF);
        this.render(0, 0, model[0].length);
    };
    var getZ = function(layerNum){
        if(!model&&!model[layerNum]){
            return '-1';
        }
        var cmds = model[layerNum];
        for(var i=0;i<cmds.length;i++){
            if(cmds[i].prevZ!==undefined)return cmds[i].prevZ;
        }
        return '-1';
    };
    this.getZ = getZ;

    /**
     * Adjusts all other renderer2ds to the perspective of this renderer
     */
    this.adjustToThis = function() {
        var origin = ctx.transformedPoint(0, 0);
        console.log(origin.x, origin.y);
        events.view.renderer2d.adjust.dispatch(view.getName(), absZoom, -origin.x, -origin.y);
    }

    var __constructor = function() {
        self = this;
        canvas = $(canvasRoot);
        startCanvas();
        initialized = true;
        ctx.translate((canvas[0].width - gridSizeX*zoomFactor)/2,gridSizeY*zoomFactor+(canvas[0].height - gridSizeY*zoomFactor)/2);
        config.configChangedEvent.add(updateLocalConfig);
        updateLocalConfig();
    }();
    return this;
});
