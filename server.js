import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   CONFIG
========================= */
const TEST_MODE = true; // 🔧 true = ใช้พิกัดจำลอง | false = ใช้ GPS จริง

/* =========================
   MySQL CONFIG (POOL)
========================= */
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'smartbag_db',
  waitForConnections: true,
  connectionLimit: 10
});

console.log('✅ MySQL Pool Created');

/* =========================
   MQTT CONFIG
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const TOPIC_DATA = 'smartbag/data';
const TOPIC_CMD  = 'smartbag/cmd';

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected');
  mqttClient.subscribe(TOPIC_DATA);
});

/* =========================
   MQTT RECEIVE FROM ESP32
========================= */
mqttClient.on('message', (topic, message) => {
  if (topic !== TOPIC_DATA) return;

  try {
    const data = JSON.parse(message.toString());
    console.log('📡 Data from ESP32:', data);

    let lat = Number(data.lat);
    let lng = Number(data.lng);
    const rssi = Number(data.rssi);
    const state = data.state || 'UNKNOWN';

    /* ===== TEST MODE ===== */
    if (TEST_MODE && (!lat || !lng)) {
      lat = 7.888888;
      lng = 98.333333;
      console.log('🧪 TEST MODE: using mock GPS');
    }

    /* ===== REAL MODE ===== */
    if (!TEST_MODE && (!lat || !lng)) {
      console.log('⚠ GPS not fixed, skip insert');
      return;
    }

    const sql = `
      INSERT INTO tracking (lat, lng, rssi, state)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [lat, lng, rssi, state], err => {
      if (err) {
        console.error('❌ Insert Error:', err);
      } else {
        console.log('✅ Inserted to DB');
      }
    });

  } catch (err) {
    console.error('❌ MQTT JSON Parse Error:', err);
  }
});

/* =========================
   API FOR WEB DASHBOARD
========================= */

// 🔹 ประวัติย้อนหลัง (เวลาเป็นเวลาปัจจุบันจริง)
app.get('/api/history', (req, res) => {
  const sql = `
    SELECT
      id,
      lat,
      lng,
      rssi,
      state,
      created_at
    FROM tracking
    ORDER BY id DESC
    LIMIT 100
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// 🔹 สั่งหยุดเสียง
app.post('/api/stop', (req, res) => {
  mqttClient.publish(TOPIC_CMD, 'STOP');
  console.log('🔇 CMD: STOP');
  res.json({ status: 'STOP SENT' });
});

// 🔹 สั่งเปิดเสียง
app.post('/api/start', (req, res) => {
  mqttClient.publish(TOPIC_CMD, 'START');
  console.log('🔊 CMD: START');
  res.json({ status: 'START SENT' });
});

/* =========================
   START SERVER
========================= */
app.listen(8080, () => {
  console.log('🚀 Server running on http://localhost:8080');
});
