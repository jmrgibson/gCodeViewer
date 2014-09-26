<?php

$eventIn = $_GET['evt'];
$value = $_GET['val'];

$shellcmd = "python processEvent.py " . $eventIn . " " . $value;

//echo "hi";
//echo "cmd: " . $shellcmd;
echo shell_exec($shellcmd);
//echo shell_exec("python test.py");

?>