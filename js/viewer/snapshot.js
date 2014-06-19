/**
 * User: Fabian Keller (fabiankeller1000@googlemail.com)
 * Date: 05/26/14
 * Time: 4:51 PM
 */
GCODE.snapshot = function (gCodeApp, bindToView) {

    /**
     * Holds the GCode application
     * @type {GCODE.app}
     */
    var app = gCodeApp;

    /**
     * Holds the view
     * @type {GCODE.view}
     */
    var view = bindToView;

    /**
     * Holds the GCODE app events
     * @type {GCODE.events}
     */
    var events = app.getEventManager();

    /**
     * Holds the snapshot DOM root.
     * @type {jQuery}
     */
    var root = view.getRoot().find(".tabSnapshot");

    /**
     * Holds the JCrop api instance
     */
    var jcrop_api = null;

    /**
     * Holds the view canvas
     */
    var canvas = view.getRoot().find(".render2d")[0];

    /**
     * Returns the generated file name
     */
    var createFileName = function () {
        // initial file name
        var filename;
        if (view.hasLoaded()) {
            filename = view.getLoaded().getName();
        } else {
            filename = "gcode";
        }

        // remove gcode file extension
        if (-1 != filename.indexOf(".")) {
            filename = filename.substr(0, filename.lastIndexOf("."));
        }

        // inject date
        var now = new Date();
        var p = function (n) {
            return ('0' + n).slice(-2)
        }
        var date = [now.getFullYear(), p(now.getMonth() + 1) , p(now.getDate())].join("-");
        date += "_" + [p(now.getHours()), p(now.getMinutes()), p(now.getSeconds())].join("-");

        // assemble file name
        return filename + "_L" + view.getRoot().find(".curLayer").text() + "_" + date + ".png";
    };

    /**
     * Returns the base64 encoded image data taken from the canvas.
     */
    var toPNG = function (scale) {
        if (scale == undefined) {
            scale = false;
        }
        var target = {
            width: canvas.width,
            height: canvas.height,
            drawStartX: 0,
            drawStartY: 0
        };
        if (jcrop_api) {
            var size = jcrop_api.tellSelect();
            if (size.w != 0 && size.h != 0) {
                target.width = size.w;
                target.height = size.h;
                target.drawStartX = size.x;
                target.drawStartY = size.y;
            }
        }

        // create new canvas
        var destinationCanvas = document.createElement("canvas");
        destinationCanvas.width = target.width;
        destinationCanvas.height = target.height;
        var destCtx = destinationCanvas.getContext('2d');

        // create a rectangle with the desired color
        destCtx.fillStyle = "#FFFFFF";
        destCtx.fillRect(0, 0, target.width, target.height);

        //draw the original canvas onto the destination canvas
        var oldDrawGrid = app.getConfig().drawGrid.get();
        app.getConfig().drawGrid.set(false);
        destCtx.drawImage(canvas, -target.drawStartX, -target.drawStartY);
        app.getConfig().drawGrid.set(oldDrawGrid);

        // get image
        return destinationCanvas;
    }

    /**
     * Trigger snapshot download
     */
    var download = function () {
        var imgCanvas = toPNG(true);
        var filename = createFileName();
        imgCanvas.toBlob(function(snapshotBlob) {
            saveAs(snapshotBlob, filename);
        });
    };

    /**
     * Takes a snapshot of the canvas the mouse is hovering over.
     */
    var updateEditor = function () {
        // remove existing jcrop
        if (jcrop_api) {
            jcrop_api.destroy();
            jcrop_api = null;
        }

        // set new image
        var img = toPNG().toDataURL("image/png");
        root.find("img.snapshot").attr("src", img);

        _.defer(function () {
            root.find("img.snapshot").Jcrop({
                onChange: function () {
                    if (view.isHovered() && app.getConfig().synced.get()) {
                        events.view.renderer2d.cropSnapshot.dispatch(_.values(_.pick(jcrop_api.tellSelect(), "x", "y", "x2", "y2")));
                    }
                },
                trueSize: [canvas.width, canvas.height],
                keySupport: false
            }, function () {
                jcrop_api = this;
            });
        });
    }

    /**
     * Updates the crop size.
     * @param array
     */
    var updateCrop = function (array) {
        if (array == undefined || view.isHovered() || !app.getConfig().synced.get() || jcrop_api == null) {
            return;
        }
        if (array[0] == array[2] || array[1] == array[3]) {
            jcrop_api.release();
        } else {
            jcrop_api.setSelect(array);
        }
    }
    events.view.renderer2d.cropSnapshot.add(updateCrop);

    /**
     * Download this snapshot if we download all.
     */
    root.find("a.download").click(function(e) {
        download();
        return e.preventDefault();
    });
    events.view.renderer2d.downloadSnapshots.add(function() {
        if (root.hasClass("active")) {
            download();
        }
    })

    /**
     * Public method to take snapshot
     */
    this.takeSnapshot = updateEditor;
    root.find(".download-all").click(function() {
        events.view.renderer2d.downloadSnapshots.dispatch();
    });

    return this;
};