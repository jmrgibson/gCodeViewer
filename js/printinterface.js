//MUST BE ALL LOWER CASE

var vsettings = {};
var settings = {
    dropperiod: 1000,
    dropduty: 50,
    tracewidth: 2,
    feedrate: 100,
    percentoverlap: 0
};

var events = { updateSettings: 'hi' }



function mapClick(){
    sndJog(event.target.id);
}
function initMap() {

    //finds the position of the images used
    var buttonSize = 70;    //in pixels
    var mapimg = document.getElementById("imgjogmap");
    var xpos = mapimg.offsetLeft;
    var ypos = mapimg.offsetTop;
    //var xcenter = -xpos / 2 + mapimg.offsetWidth / 2 - buttonSize / 2;
    //var ycenter = -ypos / 2 + mapimg.offsetHeight / 2 - buttonSize / 2;
    var xcenter = mapimg.offsetWidth / 2 - buttonSize / 2;
    var ycenter = mapimg.offsetHeight / 2 - buttonSize / 2;

    //loops through creating a number of map area objects corresponding to locations
    var mapbuttons = [];
    var i;
    var buttonpositions = [-3, -2, -1, 1, 2, 3]
    for (i = 0; i < buttonpositions.length; i++) {
        var dir;
        if (buttonpositions[i] > 0) {
            dir = '+';
        } else {
            dir = '-';
        }
        var button1 = { x: buttonpositions[i], y: 0, cmd: 'X' + dir + Math.abs(buttonpositions[i]) };
        var button2 = { x: 0, y: -1 * buttonpositions[i], cmd: 'Y' + dir + Math.abs(buttonpositions[i]) };
        mapbuttons[mapbuttons.length] = button1;
        mapbuttons[mapbuttons.length] = button2;
    }

    //creates the elements with appropriate properties and adds them to the map
    for (i = 0; i < mapbuttons.length; i++) {
        var area = document.createElement("AREA");
        area.alt = "Click to jog the printer";
        area.title = mapbuttons[i].cmd;
        area.shape = "rect";
        area.onclick = mapClick;
        //needs seperated coords here otherwise adding strings and ints gets messy
        var xcord1 = xcenter + mapbuttons[i].x * buttonSize;
        var ycord1 = ycenter + mapbuttons[i].y * buttonSize;
        var xcord2 = xcenter + mapbuttons[i].x * buttonSize + buttonSize;
        var ycord2 = ycenter + mapbuttons[i].y * buttonSize + buttonSize;
        area.coords = xcord1 + "," + ycord1 + "," + xcord2 + "," + ycord2;
        area.id = mapbuttons[i].cmd;
        jogmap.appendChild(area);
    }
}
function initSettings() {
    var newDiv = document.createElement("div");

    for (setting in settings) {
        vsettings[setting] = document.createElement("textarea");
        vsettings[setting].cols = "20";
        vsettings[setting].rows = "1";
        vsettings[setting].id = setting;
        newDiv.appendChild(vsettings[setting]);

    }

    var currentDiv = document.getElementById('settingsdiv');
    currentDiv.appendChild(newDiv);

    //getSettings();
}
                      
function sendEvent(evnt, value) {

    var debugEcho = false;


    var xmlhttp;
    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    } else {// code for IE6, IE5
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //alert('msg rsg!');
            if (debugEcho) {
                displayDebugEcho(xmlhttp.responseText);
                //incommingEvent(xmlhttp.responseText);
            } else {
                //incommingEvent(xmlhttp.responseText);
                displayDebugEcho(xmlhttp.responseText);
            }
        }
    }
    if (debugEcho) {
        //xmlhttp.open("GET", "echoevent.php?evt=" + evnt + "&val=" + value, true);
    } else {
        xmlhttp.open("GET", "forwardevent.php?evt=" + evnt + "&val=" + value, true);
        //xmlhttp.open("GET", "forwardevent.php?evt=hi&val=test", true);
    }
    xmlhttp.send();
}

function displayDebugEcho(response) {
    document.getElementById("cmdOut").innerHTML += response + "\n";
}

function incommingEvent(response) {
    scrollTextArea();
    var strqs = response.split(':');
    switch (strqs[0]) {
        case "updateSettings":
            updateSettings(strqs[1]);
            break;
        case "settingsWrote":
            document.getElementById("cmdOut").innerHTML += "Settings updated on printer successfully.\n";
        case "message":
            document.getElementById("cmdOut").innerHTML += strqs[1] + '\n';



    }


}

function updateSettings(inputSettings) {
    var settingpairs = inputSettings.split('_');
    for (i = 0; i < settingpairs.length; i++) {
        //		document.getElementById("cmdOut").innerHTML += settingpairs[i] + "\n";		
        var setval = settingpairs[i].split('-');
        settings[setval[0]] = setval[1];
        //		document.getElementById("cmdOut").innerHTML += setval[0] + ':' + setval[1] + "\n";		
        document.getElementById(setval[0]).innerHTML = setval[1].replace(/(\r\n|\n|\r)/gm, "");	//displays values and removes line breaks
        //vsettings[setval[0]].value = setval[1];
    }


}

function setSettings() {
    //build output string name-val_name2-val2 etc etc
    var strout = "";
    for (setting in settings) {
        settings[setting] = vsettings[setting].value;
        strout = strout + setting + "-" + settings[setting] + "_";
    }
    //remove last _
    strout = strout.slice(0, -1);

    sendEvent("setSettings", strout);

}

function getSettings() {
    sendEvent("getSettings", "None");
}

function sndJog(jogstr) {
    if (document.getElementById("dwjcheck").checked) {
        jogstr = jogstr + 'd';  //adds d to the end for drops while jogging
    }
    sendEvent("jog", jogstr);
}

function sndCmd(str) {
    if (str.length != 0) {
        sendEvent('sendGcode', str);    //send command
        str = str.replace('\n','');                     //remove newlines
        incommingEvent('Sent: ' + str); //echo message
        document.getElementById("cmdIn").value = "";    //clear input line
    }

}

function scrollTextArea() {
    $('#cmdOut').scrollTop($('#cmdOut')[0].scrollHeight);
}

function sendHome() {
    sendEvent('homecycle','a')
}

function updatePWM() {
    var imode = document.getElementById('pwmMode')
    var iduty = document.getElementById('pwmDuty');
    var iperiod = document.getElementById('pwmPeriod');
    var ihold = document.getElementById('pwmHold');

    var pwmSettings = {
        mode:imode.value,
        period:iperiod.value,
        duty: iduty.value
    };

    if (imode == 'holdcustom') {
        pwmSettings["hold"] = ihold.value;
    }

    sendEvent('updatePWM', JSON.stringify(pwmSettings));
}

function pwmDisplay() {
    mode = document.getElementById('pwmMode');
    hold = document.getElementById('pwmHold');
    if (mode.value == 'holdcustom') { 
        hold.disabled = false; 
    } else {
        hold.disabled = true;
    }
    
}

function startPrint() {
    //send print command to 
}