/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:31 AM
 */

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
              ? args[number]
              : match
            ;
        });
    };
}

if (typeof (String.prototype.trim) === "undefined") {
    String.prototype.trim = function () {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

function getAngle(x1, y1, x2, y2) {
    var len1 = Math.sqrt(x1 * x1 + y1 * y1);
    var len2 = Math.sqrt(x2 * x2 + y2 * y2);

    var a1 = Math.acos(x1 / len1) * (180 / Math.PI);
    if (y1 < 0) {
        a1 = 360 - a1;
    }

    var a2 = Math.acos(x2 / len2) * (180 / Math.PI);
    if (y2 < 0) {
        a2 = 360 - a2;
    }

    return [a1, a2];
}

function displayProcessor(gcode) {
    //now is lines, not file object

    var newgcode = [];
    var printing = false;
    var validLine = false;

    var i = 0;
    var xcurrent = 0.0;
    var ycurrent = 0.0;
    var xcenter= 0.0;
    var ycenter = 0.0;
    var xfinal = 0.0;
    var yfinal = 0.0;

    //preamble (absolute coords, relative extrusion, millimeters)
    newgcode.push('G21')
    newgcode.push('G1 Z5 F5000')
    newgcode.push('G90')
    newgcode.push('M83')
    newgcode.push('G92 X0 Y0 Z0')
    newgcode.push('G92 E0')

    

    //regex for line checking
    var reg0 = new RegExp("G0 ");
    var reg1 = new RegExp("G1 ");
    var reg2 = new RegExp("G[0]?2 ");
    var reg3 = new RegExp("G[0]?3 ");
    var rez = new RegExp("[Z]\\s*([+-]|\\d)");
    var rey = new RegExp("[Y]\\s*([+-]|\\d)");
    var rex = new RegExp("[X]\\s*([+-]|\\d)");
    //var rey = new RegExp("[Y]\s*(-|\d)");
    //var rex = new RegExp("[X]\s*(-|\d)");
    var rezzero = new RegExp("[Z]\\s*0\\.0+");
    var rezup = new RegExp("[Z]\\s*[+]?\\d*\\.\\d*");
    var rezdown = new RegExp("[Z]\\s*[-]\\d*\\.\\d*");

    for (var i = 0; i < gcode.length; i++) {
        var line = gcode[i];
        validLine = false;

        //shitty javascript regex needs \\ escapes
        var g0 = reg0.exec(line);
        var g1 = reg1.exec(line);
        var g2 = reg2.exec(line);
        var g3 = reg3.exec(line);
        var z = rez.exec(line);
        var y = rey.exec(line);
        var x = rex.exec(line);
        var zzero = rezzero.exec(line);
        var zup = rezup.exec(line);
        var zdown = rezdown.exec(line);

        //check if we are meant to be printing or not
        if ((zdown != null) || (zzero != null)) {
            printing = true;
        } else if (zup != null) {
            printing = false;
        }

        //check and replace arcs
        if ((g2 != null) || (g3 != null)) {
            //remove whitepsace
            line = line.replace(/\s+/g, '');

            var rexv = new RegExp('X[+-]?\\d*\\.\\d*');
            var reyv = new RegExp('Y[+-]?\\d*\\.\\d*');
            var reiv = new RegExp('I[+-]?\\d*\\.\\d*');
            var rejv = new RegExp('J[+-]?\\d*\\.\\d*');

            var xv = rexv.exec(line);
            var yv = reyv.exec(line);
            var iv = reiv.exec(line);
            var jv = rejv.exec(line);
            
            //extract the x, y, i, j values from the line
            var arcx = Number(xv[0].slice(1));
            var arcy = Number(yv[0].slice(1));
            var arci = Number(iv[0].slice(1));
            var arcj = Number(jv[0].slice(1));

            //calculate geomertric variables
            var xcenter = xcurrent + arci;
            var ycenter = ycurrent + arcj;
            var radius = Math.sqrt(arci * arci + arcj + arcj);

            var angles = getAngle(-arci, -arcj, (arcx - arci), (arcy - arcj));
            var a1 = angles[0];
            var a2 = angles[1];
            var a = a2 - a1;

            //handle correct lengths for arcs in different directions
            if (((a > 180) && (a > 0)) && (g2 != null)) {
                a = a + 180;
            } else if (((a < 0) && (a > -180)) && (gg != null)) {
                a = a - 180;
            } else if ((a > 180) && (g2 != null)) {
                a = a - 180;
            } else if ((a < -180) && (g3 != null)) {
                a = a + 180;
            }

            var numsteps = 25;
            var anglelist = [];
            var offsetanglelist = [];
            var points = [];

            //populate list of angles of the points
            if (g3 != null) {
                for (var i = 0; i < numsteps + 1; i++) {
                    anglelist.push(i * (Math.abs(a) / numsteps));
                }
                for (var i = 0; i < numsteps + 1; i++) {
                    offsetanglelist.push(anglelist[i] + a1);
                }
            } else if (g2 != null) {
                for (var i = 0; i < numsteps + 1; i++) {
                    anglelist.push(-i * (Math.abs(a) / numsteps));
                }
                for (var i = 0; i < numsteps + 1; i++) {
                    offsetanglelist.push(anglelist[i] + a1);
                }
            }

            //work out co-ordinates of points along the arc
            for (var i = 0; i < offsetanglelist.length; i++) {
                points.push([radius * Math.cos((Math.PI / 180) * offsetanglelist[i]), radius * Math.sin((Math.PI / 180) * offsetanglelist[i])]);
            }

            //format and output
            for (var i = 0; i < points.length; i++) {
                var arcline = "G1 X{0} Y{1}".format(points[i][0].toFixed(3), points[i][1].toFixed(3));
                newgcode.push(arcline);
            }

            newgcode.push("");
        }



        //normal moves
        if ((g1 != null) || (g0 != null)) {
            //remove all whitespace
            var line = line.replace(/\s+/g, '');

            var newline = 'G1 ';
            //remove whitespace between x ### etc. Also update current position
            if (x != null) {
                validLine = true;
                var rexp = new RegExp('X[+-]?\\d*\\.\\d*');
                var xp = rexp.exec(line);
                xcurrent = Number(xp[0].slice(1));
                newline = newline + xp + ' ';
            }

            if (y != null) {
                validLine = true;
                var reyp = new RegExp('Y[+-]?\\d*\\.\\d*');
                var yp = reyp.exec(line);
                ycurrent = Number(yp[0].slice(1));
                newline = newline + yp + ' ';
            }

            //add extrude if printing (shows in black)
            if (printing) {
                newline = newline.trim() + ' E2.5';
            } else {
                newline = newline.trim();
            }

        }

           
        if (validLine) {
            newgcode.push(newline);
        }

    }
    newgcode.push("");
    return newgcode;
}

GCODE.gCodeReader = (function(){
// ***** PRIVATE ******
    var gcode, lines;
    var z_heights = {};
    var model = [];
    var max = {x: undefined, y: undefined, z: undefined};
    var min = {x: undefined, y: undefined, z: undefined};
    var modelSize = {x: undefined, y: undefined, z: undefined};
    var filamentByLayer = {};
    var filamentByExtruder = {};
    var printTimeByLayer;
    var totalFilament=0;
    var printTime=0;
    var totalWeight = 0;
    var layerHeight = 0;
    var layerCnt = 0;
    var layerTotal = 0;
    var speeds = {};
    var slicer = 'unknown';
    var speedsByLayer = {};
    var volSpeeds = {};
    var volSpeedsByLayer = {};
    var extrusionSpeeds = {};
    var extrusionSpeedsByLayer = {};
    var gCodeOptions = {
        sortLayers: false,
        purgeEmptyLayers: true,
        analyzeModel: false,
        filamentType: "ABS",
        filamentDia: 1.75,
        nozzleDia: 0.4
    };

    var prepareGCode = function () {
        //not actually used?
        if(!lines)return;
        gcode = [];
        var i;
        for(i=0;i<lines.length;i++){
            if(lines[i].match(/^(G0|G1|G90|G91|G92|M82|M83|G28)/i))gcode.push(lines[i]);
        }
        lines = [];
        console.log("GCode prepared");
    };

    var sortLayers = function(){
        var sortedZ = [];
        var tmpModel = [];
//        var cnt = 0;
//        console.log(z_heights);
        for(var layer in z_heights){
            sortedZ[z_heights[layer]] = layer;
//            cnt++;
        }
//        console.log("cnt is " + cnt);
        sortedZ.sort(function(a,b){
            return a-b;
        });
//        console.log(sortedZ);
//        console.log(model.length);
        for(var i=0;i<sortedZ.length;i++){
//            console.log("i is " + i +" and sortedZ[i] is " + sortedZ[i] + "and z_heights[] is " + z_heights[sortedZ[i]] );
            if(typeof(z_heights[sortedZ[i]]) === 'undefined')continue;
            tmpModel[i] = model[z_heights[sortedZ[i]]];
        }
        model = tmpModel;
//        console.log(model.length);
        delete tmpModel;
    };

    var purgeLayers = function(){
        var purge=true;
        if(!model){
            console.log("Something terribly wrong just happened.");
            return;
        }
        for(var i=0;i<model.length;i++){
            purge=true;
            if(typeof(model[i])==='undefined')purge=true;
            else {
                for(var j=0;j<model[i].length;j++){
                    if(model[i][j].extrude)purge=false;
                }
            }
            if(purge){
                model.splice(i,1);
                i--;
            }
        }
    };

    var getParamsFromKISSlicer = function(gcode){
        var nozzle = gcode.match(/extrusion_width_mm\s*=\s*(\d*\.\d+)/m);
        if(nozzle){
            gCodeOptions['nozzleDia'] = nozzle[1];
        }
        var filament = gcode.match(/fiber_dia_mm\s*=\s*(\d*\.\d+)/m);
        if(filament){
            gCodeOptions['filamentDia'] = filament[1];
        }
    }

    var getParamsFromSlic3r = function(gcode){
        var nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
        if(nozzle){
            gCodeOptions['nozzleDia'] = nozzle[1];
        }
        var filament = gcode.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
        if(filament){
            gCodeOptions['filamentDia'] = filament[1];
        }
    }

    var getParamsFromSkeinforge =function(gcode){

        var nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
        if(nozzle){
            gCodeOptions['nozzleDia'] = nozzle[1];
        }
        var filament = gcode.match(/Filament_Diameter_(mm)\s*:\s*(\d*\.\d+)/m);
        if(filament){
            gCodeOptions['filamentDia'] = filament[1];
        }
    }

    var getParamsFromMiracleGrue = function(gcode){

    }

    var getParamsFromCura = function(gcode){
//        console.log("cura");
        var profileString = gcode.match(/CURA_PROFILE_STRING:((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))/m);
        if(profileString){
            var raw = window.atob(profileString[1]);
            var array = new Uint8Array(new ArrayBuffer(raw.length));

            for(i = 0; i < raw.length; i++) {
                array[i] = raw.charCodeAt(i);
            }
            var data = new Zlib.inflate(array.subarray(2, array.byteLength-4));
            var msg;
            for(i=0; i < data.length; i+=1) {
                msg+=String.fromCharCode(data[i]);
            }
            var nozzle = msg.match(/nozzle_size\s*=\s*(\d*\.\d+)/m);
            if(nozzle){
                gCodeOptions['nozzleDia'] = nozzle[1];
            }
            var filament = msg.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
            if(filament){
                gCodeOptions['filamentDia'] = filament[1];
            }

        }
    }

    var detectSlicer = function(gcode){

        if(gcode.match(/Slic3r/)){
            slicer = 'Slic3r';
            getParamsFromSlic3r(gcode);
        }else if(gcode.match(/KISSlicer/)){
            slicer = 'KISSlicer';
            getParamsFromKISSlicer(gcode);
        }else if(gcode.match(/skeinforge/)){
            slicer = 'skeinforge';
            getParamsFromSkeinforge(gcode);
        }else if(gcode.match(/CURA_PROFILE_STRING/)){
            slicer = 'cura';
            getParamsFromCura(gcode);
        }else if(gcode.match(/Miracle/)){
            slicer = 'makerbot';
            getParamsFromMiracleGrue(gcode);
        }

    }


// ***** PUBLIC *******
    return {

        loadFile: function(reader){
            console.log("loadFile");
            model = [];
            z_heights = [];
            detectSlicer(reader.target.result);
            lines = reader.target.result.split(/\n/);
            reader.target.result = null;

            console.log(lines);
            var newlines = displayProcessor(lines);
            console.log(newlines);

            GCODE.ui.worker.postMessage({
                    "cmd":"parseGCode",
                    "msg":{
                        gcode: newlines,
                        options: {
                            firstReport: 5
                        }
                    }
                }
            );
            delete lines;
            delete newlines;



        },
        setOption: function(options){
            for(var opt in options){
                gCodeOptions[opt] = options[opt];
            }
        },
        passDataToRenderer: function(){
//                        console.log(model);
            if(gCodeOptions["sortLayers"])sortLayers();
//            console.log(model);
            if(gCodeOptions["purgeEmptyLayers"])purgeLayers();
//            console.log(model);
            GCODE.renderer.doRender(model, 0);
            GCODE.renderer3d.setModel(model);

        },
        processLayerFromWorker: function(msg){
//            var cmds = msg.cmds;
//            var layerNum = msg.layerNum;
//            var zHeightObject = msg.zHeightObject;
//            var isEmpty = msg.isEmpty;
//            console.log(zHeightObject);
            model[msg.layerNum] = msg.cmds;
            z_heights[msg.zHeightObject.zValue] = msg.zHeightObject.layer;
//            GCODE.renderer.doRender(model, msg.layerNum);
        },
        processMultiLayerFromWorker: function(msg){
            for(var i=0;i<msg.layerNum.length;i++){
                model[msg.layerNum[i]] = msg.model[msg.layerNum[i]];
                z_heights[msg.zHeightObject.zValue[i]] = msg.layerNum[i];
            }
//            console.log(model);
        },
        processAnalyzeModelDone: function(msg){
            min = msg.min;
            max = msg.max;
            modelSize = msg.modelSize;
            totalFilament = msg.totalFilament;
            filamentByLayer = msg.filamentByLayer;
            filamentByExtruder = msg.filamentByExtruder;
            speeds = msg.speeds;
            speedsByLayer = msg.speedsByLayer;
            printTime = msg.printTime;
            printTimeByLayer = msg.printTimeByLayer;
            layerHeight = msg.layerHeight;
            layerCnt = msg.layerCnt;
            layerTotal = msg.layerTotal;
            volSpeeds = msg.volSpeeds;
            volSpeedsByLayer = msg.volSpeedsByLayer;
            extrusionSpeeds = msg.extrusionSpeeds;
            extrusionSpeedsByLayer = msg.extrusionSpeedsByLayer;

            var density = 1;
            if(gCodeOptions['filamentType'] === 'ABS') {
                density = 1.04;
            }else if(gCodeOptions['filamentType'] === 'PLA') {
                density = 1.24;
            }
            totalWeight = density*3.141*gCodeOptions['filamentDia']/10*gCodeOptions['filamentDia']/10/4*totalFilament/10;

            gCodeOptions['wh'] = parseFloat(gCodeOptions['nozzleDia'])/parseFloat(layerHeight);
            if(slicer === 'Slic3r' || slicer === 'cura'){
                // slic3r stores actual nozzle diameter, but extrusion is usually slightly thicker, here we compensate for that
                // kissslicer stores actual extrusion width - so no need for that.
                gCodeOptions['wh'] = gCodeOptions['wh']*1.1;
            }
        },
        getLayerFilament: function(z){
            return filamentByLayer[z];
        },
        getLayerSpeeds: function(z){
          return speedsByLayer[z]?speedsByLayer[z]:{};
        },
        getModelInfo: function(){
            return {
                min: min,
                max: max,
                modelSize: modelSize,
                totalFilament: totalFilament,
                filamentByExtruder: filamentByExtruder,
                speeds: speeds,
                speedsByLayer: speedsByLayer,
                printTime: printTime,
                printTimeByLayer: printTimeByLayer,
                totalWeight: totalWeight,
                layerHeight: layerHeight,
                layerCnt: layerCnt,
                layerTotal: layerTotal,
                volSpeeds: volSpeeds,
                volSpeedsByLayer: volSpeedsByLayer,
                extrusionSpeeds: extrusionSpeeds,
                extrusionSpeedsByLayer: extrusionSpeedsByLayer
            };
        },
        getGCodeLines: function(layer, fromSegments, toSegments){
            var i=0;
            var result = {first: model[layer][fromSegments].gcodeLine, last: model[layer][toSegments].gcodeLine};
            return result;
        },
        getOptions: function(){
            return gCodeOptions;
        }
    }
}());
