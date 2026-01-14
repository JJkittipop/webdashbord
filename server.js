import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';
import path from 'path';                // 👈 (เพิ่ม) เพื่อจัดการที่อยู่ไฟล์
import { fileURLToPath } from 'url';    // 👈 (เพิ่ม) เพื่อใช้ใน Node.js รุ่นใหม่

/* =========================
   SETUP
========================= */
// สร้างตัวแปร __dirname ให้ใช้งานได้
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 1. ตั้งค่าให้ Server รู้จักโฟลเดอร์หน้าเว็บ (dist)
app.use(express.static(path.join(__dirname, 'dist')));

/* =========================
   CONFIG
========================= */
const TEST_MODE = false;

/* =========================
   MySQL CONFIG (ALWAYS DATA) ☁️
========================= */
const db = mysql.createPool({
  host: 'mysql-smartbag-tracking.alwaysdata.net',
  user: 'smartbag-tracking',
  password: 'bigolive0973541561',  // 🔑 รหัสผ่านเดิมของคุณ
  database: 'smartbag-tracking_db',
  waitForConnections: true,
  connectionLimit: 10
});

console.log('✅ MySQL Pool Configured for Alwaysdata');

/* =========================
   PART 1: HTTP RECEIVE FROM ESP32 (แก้ไขแล้ว) 📡
   👉 เปลี่ยนเป็น GET และรับค่าจาก req.query เพื่อให้ตรงกับ ESP32
========================= */
app.get('/api/data', (req, res) => {
  console.log('📡 Data from ESP32 (HTTP GET):', req.query);

  // รับค่าจาก URL Query String (เช่น ?lat=13.5&lng=100.5...)
  let lat = Number(req.query.lat);
  let lng = Number(req.query.lng);
  const rssi = req.query.rssi || '0';
  const state = req.query.state || 'NORMAL';

  // ตรวจสอบข้อมูล GPS (ถ้าไม่ใช่โหมดทดสอบ)
  if (!TEST_MODE && (!lat || !lng || lat === 0 || lng === 0)) {
    console.log('⚠ GPS Invalid, Skipping insert.');
    return res.status(400).send('GPS Invalid');
  }

  // บันทึกลงฐานข้อมูล
  const sql = `INSERT INTO tracking (lat, lng, rssi, state) VALUES (?, ?, ?, ?)`;
  db.query(sql, [lat, lng, rssi, state], (err) => {
    if (err) {
      console.error('❌ Insert Error:', err);
      res.status(500).send('Database Error');
    } else {
      console.log('✅ Inserted to DB via HTTP');
      res.status(200).send('OK');
    }
  });
});

/* =========================
   MQTT CONFIG (ของเดิม)
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected');
  mqttClient.subscribe('smartbag/data');
});

// รับ MQTT (เก็บไว้เป็น Backup)
mqttClient.on('message', (topic, message) => {
  if (topic === 'smartbag/data') {
    console.log('📡 MQTT Backup Data:', message.toString());
  }
});

/* =========================
   API FOR WEB DASHBOARD (ของเดิม)
========================= */
app.get('/api/history', (req, res) => {
  const sql = `SELECT * FROM tracking ORDER BY id DESC LIMIT 100`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/stop', (req, res) => {
  mqttClient.publish('smartbag/cmd', 'STOP');
  res.json({ status: 'STOP SENT' });
});

app.post('/api/start', (req, res) => {
  mqttClient.publish('smartbag/cmd', 'START');
  res.json({ status: 'START SENT' });
});

/* =========================
   PART 4: เปิดหน้าเว็บ (ไม้ตายแก้ Cannot GET /) 🌐
========================= */
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
      // ส่งไฟล์ index.html ให้คนที่เข้าเว็บทุกกรณี
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
      res.status(404).send('API Not Found');
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 8100; 
app.listen(PORT, () => {
  console.log(`🚀 Server running on Port ${PORT}`);
});