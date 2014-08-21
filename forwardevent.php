<?php

$eventIn = $_GET['evt'];
$value = $_GET['val'];

echo shell_exec("python processEvent.py " . $eventIn . " " . $value . "\n");

?>