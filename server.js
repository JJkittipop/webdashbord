import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';
import path from 'path';                
import { fileURLToPath } from 'url';    
import axios from 'axios'; 

/* =========================
   SETUP
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  password: 'bigolive0973541561',
  database: 'smartbag-tracking_db',
  waitForConnections: true,
  connectionLimit: 10
});

console.log('✅ MySQL Pool Configured for Alwaysdata');

/* =========================
   PART 1: HTTP RECEIVE FROM ESP32 📡
========================= */
app.get('/api/data', (req, res) => {
  console.log('📡 Data from ESP32 (HTTP GET):', req.query);

  let lat = Number(req.query.lat);
  let lng = Number(req.query.lng);
  const rssi = req.query.rssi || '0';
  const state = req.query.state || 'NORMAL';

  if (!TEST_MODE && (!lat || !lng || lat === 0 || lng === 0)) {
    console.log('⚠ GPS Invalid, Skipping insert.');
    return res.status(400).send('GPS Invalid');
  }

  // -------------------------------------------------------------------------
  // 👈 [ส่วนที่ปรับแก้] Logic การส่ง LINE OA ทั้งกรณี ALERT และ SAFE
  // -------------------------------------------------------------------------
  const LINE_OA_TOKEN = 'KLLWtoz4ZRPJ9Ku4Xxs8mPCerJzAjtQIQPpux9TiPmg4OxV4SWiWP3lQkOTn01qCCn31PA50CMbRyneFYX7NeXfqLWJxgaq7X1vw0dpXpzkf++L1nvYfV8VH5DNGnUYVzIajAnxQ2dI7xehHmmGLZwdB04t89/1O/w1cDnyilFU=';
  const MY_USER_ID = 'U05a1994ac36df31ff5abf037b9291c82';

  let messageText = "";
  if (state === 'ALERT') {
    messageText = `⚠️ ALERT! กระเป๋าหลุดการเชื่อมต่อ\nพิกัดปัจจุบัน: https://www.google.com/maps?q=${lat},${lng}`;
  } else if (state === 'SAFE') {
    messageText = `✅ CONNECTED! เชื่อมต่อกระเป๋าสำเร็จ\nตำแหน่งปัจจุบัน: https://www.google.com/maps?q=${lat},${lng}`;
  }

  // ส่ง LINE เฉพาะเมื่อเป็นสถานะ ALERT หรือ SAFE เท่านั้น
  if (messageText !== "") {
    axios.post('https://api.line.me/v2/bot/message/push', {
      to: MY_USER_ID,
      messages: [{ type: 'text', text: messageText }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_OA_TOKEN}`
      }
    }).then(() => console.log(`>> LINE OA SENT: ${state}`))
      .catch(err => console.error('>> LINE Error:', err.message));
  }
  // -------------------------------------------------------------------------

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
   MQTT CONFIG (ของเดิม - คงเดิม)
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected');
  mqttClient.subscribe('smartbag/data');
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'smartbag/data') {
    console.log('📡 MQTT Backup Data:', message.toString());
  }
});

/* =========================
   API FOR WEB DASHBOARD (ของเดิม - คงเดิม)
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
   PART 4: เปิดหน้าเว็บ (คงเดิม)
========================= */
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
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