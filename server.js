import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

/* =========================
   SETUP ENV & PATHS
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ แก้ไขจุดที่ 1: เพิ่ม Header สำหรับ Ngrok และ CORS
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true"); // ข้ามหน้าแจ้งเตือนของ Ngrok
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));

/* =========================
   CONFIG LINE OA
========================= */
const LINE_OA_TOKEN = 'w3IQ6GcROqOxzJ+JYmhH17bcWc7hkThiwrFxm6LbrA0v915DNWjHI0xkU9nQqTHBiJsTVs+oqX6AqKOyGA8WuaNZ7x8thmL1W3J9N7xuNxmljDyk8mBrmmapUQdA6+3GyaEiztqXqp5C0XdGWbl8FQdB04t89/1O/w1cDnyilFU=';
const MY_USER_ID = 'U3c348ad3d07006159e2e6314f18b83c8'; 
let lastLineState = "NORMAL"; 

/* =========================
   MySQL CONFIG (XAMPP/Local)
========================= */
const db = mysql.createPool({
  host: 'localhost', 
  user: 'root', // 💡 ปกติ XAMPP user จะเป็น root นะครับ ถ้าคุณตั้งเป็น admin ให้ใช้ admin ตามเดิม
  password: '', // 💡 ปกติ XAMPP password จะว่างเปล่า ถ้าคุณตั้งเป็น 1234 ให้ใช้ตามเดิม
  database: 'smartbag_db', 
  waitForConnections: true,
  connectionLimit: 10
});

/* =========================
   MQTT CONFIG (HiveMQ)
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const clientId = "VPS_Backend_" + Math.random().toString(16).substr(2, 8); 

const client = mqtt.connect(MQTT_BROKER, { clientId });

client.on('connect', () => {
  console.log('✅ MQTT Connected to HiveMQ (Port 1883)');
  client.subscribe('smartbag/gps', (err) => {
    if (!err) console.log("📡 Subscribed to smartbag/gps");
  });
});

client.on('message', (topic, message) => {
  if (topic === 'smartbag/gps') {
    const msgString = message.toString();
    console.log('📥 ได้รับข้อมูลจากกระเป๋า:', msgString); // ✅ เปิดไว้เพื่อดูว่ามีอะไรวิ่งเข้าไหม

    try {
      const data = JSON.parse(msgString);
      const state = data.state || 'SAFE'; 
      const rssi = data.signal || -65;

      // --- ระบบแจ้งเตือน LINE ---
      if (state !== lastLineState) {
          let messageText = "";
          if (state === 'ALERT') {
              // ✅ แก้ไขจุดที่ 2: แก้ไขลิงก์ Google Maps (ใส่ $ หน้าปีกกา)
              messageText = `⚠️ ALERT! \nกระเป๋าถูกตัดขาด!\nพิกัดล่าสุด: https://www.google.com/maps?q=${data.lat},${data.lng}`;
          } else if (state === 'SAFE' && lastLineState === 'ALERT') {
              messageText = `✅ SAFE \nกระเป๋ากลับมาปลอดภัยแล้ว`;
          }

          if (messageText !== "") {
            sendLineMessage(messageText);
            lastLineState = state;
          }
      }

      // --- บันทึกลงฐานข้อมูล ---
      // ✅ แก้ไขจุดที่ 3: แก้ไขเงื่อนไขให้ยอมรับพิกัด 0.0 (data.lat !== undefined)
      if (data.lat !== undefined && data.lng !== undefined) {
          const sql = `INSERT INTO tracking (lat, lng, rssi, state) VALUES (?, ?, ?, ?)`;
          db.query(sql, [data.lat, data.lng, rssi, state], (err) => {
            if (err) console.error('❌ DB Insert Error:', err);
            else console.log('💾 บันทึกพิกัดลงฐานข้อมูลแล้ว'); 
          });
      }

    } catch (e) {
      console.error('❌ Error parsing MQTT JSON:', e);
    }
  }
});

const sendLineMessage = (text) => {
    axios.post('https://api.line.me/v2/bot/message/push', {
        to: MY_USER_ID,
        messages: [{ type: 'text', text: text }]
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_OA_TOKEN}`
        }
    }).then(() => {
        console.log(`>> LINE SENT: ${text.split('\n')[0]}`);
    }).catch(err => console.error('>> LINE Error:', err?.response?.data || err.message));
};

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

app.post('/api/start', (req, res) => {
  client.publish('smartbag/alert', 'CMD_OPEN'); 
  res.json({ status: 'OPEN SENT' });
});

app.post('/api/stop', (req, res) => {
  client.publish('smartbag/alert', 'CMD_CLOSE'); 
  res.json({ status: 'CLOSE SENT' });
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000; 
app.listen(PORT, () => {
  console.log(`🚀 VPS Cloud Server running on Port ${PORT}`);
});