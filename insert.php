<?php
header("Access-Control-Allow-Origin: *"); // อนุญาตให้ใครก็ได้ส่งข้อมูลมา (แก้ปัญหา CORS)

require 'connect.php'; // เรียกใช้ไฟล์เชื่อมต่อ

// รับค่าที่ส่งมา (ทั้งจาก Link หรือจาก ESP32)
$lat = $_REQUEST['lat'];
$lng = $_REQUEST['lng'];
$status = $_REQUEST['status'];

// เช็คว่ามีข้อมูลส่งมาไหม
if(isset($lat) && isset($lng)) {
    // คำสั่ง SQL เอาข้อมูลหย่อนลงตาราง
    $sql = "INSERT INTO tracking (lat, lng, status) VALUES ('$lat', '$lng', '$status')";

    if ($conn->query($sql) === TRUE) {
        echo "Save OK"; // ตอบกลับสั้นๆ ให้ ESP32 รู้เรื่อง
    } else {
        echo "Error: " . $sql . "<br>" . $conn->error;
    }
} else {
    echo "Waiting for data...";
}
?>