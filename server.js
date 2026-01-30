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
   CONFIG LINE OA (ย้ายมาไว้ข้างบนเพื่อให้เรียกใช้ได้ทุกที่)
========================= */
const LINE_OA_TOKEN = 'l7Rcp9wnBtHvrwJorvkwk/ANQDzvDCTMVwMOOkYvxoVVxTApWMSF63xkzxJbl9HRHuqQ+cQa2ehaZ2akFnKCwatV5R0INBlMKd0c+VfQrpWL7JH0iBiGzitibP5XrFCC0ysMHFo0+N+HaxN4SyxfjgdB04t89/1O/w1cDnyilFU=';
const MY_USER_ID = 'U05a1994ac36df31ff5abf037b9291c82';

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
   PART 1: HTTP RECEIVE FROM ESP32 📡 (4G)
========================= */
app.get('/api/data', (req, res) => {
  console.log('📡 Data from ESP32 (HTTP GET):', req.query);

  let lat = Number(req.query.lat);
  let lng = Number(req.query.lng);
  const rssi = req.query.rssi || '0';
  const state = req.query.state || 'NORMAL';

  if ((!lat || !lng || lat === 0 || lng === 0)) {
    console.log('⚠ GPS Invalid, Skipping insert.');
    return res.status(400).send('GPS Invalid');
  }

  // --- Logic การส่ง LINE OA (HTTP) ---
  let messageText = "";
  if (state === 'ALERT') {
    messageText = `⚠️ ALERT! (4G)\nกระเป๋าหลุดการเชื่อมต่อ\nพิกัด: https://www.google.com/maps?q=${lat},${lng}`;
  } else if (state === 'SAFE') {
    messageText = `✅ CONNECTED! (4G)\nเชื่อมต่อกระเป๋าสำเร็จ\nพิกัด: https://www.google.com/maps?q=${lat},${lng}`;
  }

  if (messageText !== "") {
    axios.post('https://api.line.me/v2/bot/message/push', {
      to: MY_USER_ID,
      messages: [{ type: 'text', text: messageText }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_OA_TOKEN}`
      }
    }).then(() => console.log(`>> LINE OA SENT (HTTP): ${state}`))
      .catch(err => console.error('>> LINE Error:', err.message));
  }
  // ------------------------------------

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
   MQTT CONFIG (HiveMQ) ☁️
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com'; 

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected to HiveMQ');
  mqttClient.subscribe('smartbag/data');
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'smartbag/data') {
    const msgString = message.toString();
    console.log('📡 MQTT Data Received:', msgString);

    try {
      const data = JSON.parse(msgString);
      const state = data.state || 'NORMAL'; 

      // 🔥 [ปรับปรุงใหม่] Logic ส่ง LINE เมื่อข้อมูลมาจาก MQTT 🔥
      let messageText = "";
      if (state === 'ALERT') {
          messageText = `⚠️ ALERT! (WiFi/MQTT)\nกระเป๋าหลุดการเชื่อมต่อ\nพิกัด: https://www.google.com/maps?q=${data.lat},${data.lng}`;
      }

      if (messageText !== "") {
        axios.post('https://api.line.me/v2/bot/message/push', {
          to: MY_USER_ID,
          messages: [{ type: 'text', text: messageText }]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_OA_TOKEN}`
          }
        }).then(() => console.log(`>> LINE OA SENT (MQTT): ${state}`))
          .catch(err => console.error('>> LINE MQTT Error:', err.message));
      }

      // บันทึกลงฐานข้อมูล
      const sql = `INSERT INTO tracking (lat, lng, rssi, state) VALUES (?, ?, ?, ?)`;
      db.query(sql, [data.lat, data.lng, data.rssi || 0, state], (err) => {
        if (err) console.error('❌ MQTT DB Insert Error:', err);
        else console.log('💾 Data Saved from MQTT');
      });

    } catch (e) {
      console.error('❌ Error parsing MQTT JSON:', e);
    }
  }
});

/* =========================
   API FOR WEB DASHBOARD
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
   PART 4: เปิดหน้าเว็บ
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