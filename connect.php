<?php
$servername = "localhost";
$username = "root";
$password = ""; // ปกติ XAMPP รหัสผ่านจะว่างไว้
$dbname = "smartbag_db"; // ชื่อฐานข้อมูลที่คุณเพิ่งสร้าง

// สั่งเชื่อมต่อ
$conn = new mysqli($servername, $username, $password, $dbname);

// เช็คว่าเชื่อมติดไหม
if ($conn->connect_error) {
  die("พังครับ เชื่อมไม่ได้: " . $conn->connect_error);
}
echo "เย้! เชื่อมต่อฐานข้อมูลสำเร็จแล้ว";
?>