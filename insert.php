<?php
// 1. เพิ่มบรรทัดนี้ที่บนสุด เพื่อบังคับให้ใช้เวลาประเทศไทย
date_default_timezone_set('Asia/Bangkok'); 

header("Access-Control-Allow-Origin: *");
require 'connect.php';

$lat = $_REQUEST['lat'];
$lng = $_REQUEST['lng'];
$status = $_REQUEST['status'];

// 2. สร้างตัวแปรเวลาปัจจุบันของไทย
$current_time = date("Y-m-d H:i:s"); 

if(isset($lat) && isset($lng)) {
    // 3. ปรับ SQL ให้ใส่เวลาที่แน่นอนลงไปด้วย (สมมติว่าคอลัมน์เวลาชื่อ created_at หรือ time)
    // หากคุณทราบชื่อคอลัมน์เวลาใน Database ให้เพิ่มเข้าไปแทน 'timestamp_column'
    $sql = "INSERT INTO tracking (lat, lng, status, created_at) VALUES ('$lat', '$lng', '$status', '$current_time')";

    if ($conn->query($sql) === TRUE) {
        echo "Save OK";
    } else {
        echo "Error: " . $sql . "<br>" . $conn->error;
    }
} else {
    echo "Waiting for data...";
}
?>