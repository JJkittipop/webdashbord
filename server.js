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
// เปิด CORS เพื่อให้หน้าเว็บจาก Vercel สามารถยิง API เข้ามาดึงข้อมูลประวัติได้
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// (เก็บส่วนนี้ไว้ เผื่อคุณอยากเข้าเว็บผ่าน IP ของ VPS)
app.use(express.static(path.join(__dirname, 'dist')));

/* =========================
   CONFIG LINE OA (แจ้งเตือนไลน์)
========================= */
const LINE_OA_TOKEN = 'w3IQ6GcROqOxzJ+JYmhH17bcWc7hkThiwrFxm6LbrA0v915DNWjHI0xkU9nQqTHBiJsTVs+oqX6AqKOyGA8WuaNZ7x8thmL1W3J9N7xuNxmljDyk8mBrmmapUQdA6+3GyaEiztqXqp5C0XdGWbl8FQdB04t89/1O/w1cDnyilFU=';
const MY_USER_ID = 'U3c348ad3d07006159e2e6314f18b83c8'; 

let lastLineState = "NORMAL"; 

/* =========================
   MySQL CONFIG (MariaDB บน VPS)
========================= */
const db = mysql.createPool({
  // 💡 หมายเหตุ: ถ้าคุณรันไฟล์นี้ด้วย node แบบธรรมดาให้ใช้ 'localhost'
  // แต่ถ้าคุณรันใน Docker Compose ให้เปลี่ยนกลับเป็น 'db' เหมือนเดิมนะครับ
  host: 'localhost', 
  user: 'admin',       
  password: '1234',    
  database: 'smartbag_db', 
  waitForConnections: true,
  connectionLimit: 10
});

/* =========================
   MQTT CONFIG (เปลี่ยนไปใช้ HiveMQ)
========================= */
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
// สร้าง Client ID แบบสุ่ม เพื่อไม่ให้ไปชนกับบอร์ด ESP32 หรือหน้าเว็บ
const clientId = "VPS_Backend_" + Math.random().toString(16).substr(2, 8); 

const client = mqtt.connect(MQTT_BROKER, {
    clientId: clientId
});

client.on('connect', () => {
  console.log('✅ MQTT Connected to HiveMQ (Port 1883)');
  client.subscribe('smartbag/gps', (err) => {
    if (!err) console.log("📡 Subscribed to smartbag/gps");
  });
});

client.on('message', (topic, message) => {
  if (topic === 'smartbag/gps') {
    const msgString = message.toString();
    // console.log('📥 Data Received:', msgString); // เอาคอมเมนต์ออกถ้าอยากดูข้อมูลที่วิ่งเข้า

    try {
      const data = JSON.parse(msgString);
      const state = data.state || 'SAFE'; 
      const rssi = data.signal || -65; // ดึงค่าความแรง WiFi ที่บอร์ดส่งมา

      // --- ระบบแจ้งเตือน LINE ---
      if (state !== lastLineState) {
          let messageText = "";
          if (state === 'ALERT') {
              // แก้ไขลิงก์ Google Maps ให้ทำงานได้จริง
              messageText = `⚠️ ALERT! \nกระเป๋าถูกตัดขาด!\nพิกัดล่าสุด: https://www.google.com/maps?q=${data.lat},${data.lng}`;
          } else if (state === 'SAFE' && lastLineState === 'ALERT') {
              messageText = `✅ SAFE \nกระเป๋ากลับมาปลอดภัยแล้ว`;
          }

          if (messageText !== "") {
            sendLineMessage(messageText);
            lastLineState = state;
          }
      }

      // --- บันทึกลงฐานข้อมูล MariaDB บน VPS ---
      if (data.lat && data.lng) {
          const sql = `INSERT INTO tracking (lat, lng, rssi, state) VALUES (?, ?, ?, ?)`;
          db.query(sql, [data.lat, data.lng, rssi, state], (err) => {
            if (err) console.error('❌ DB Insert Error:', err);
            // else console.log('💾 Data Saved to VPS MariaDB'); 
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

/* =========================
   SERVER START
========================= */
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000; 
app.listen(PORT, () => {
  console.log(`🚀 VPS Cloud Server running on Port ${PORT}`);
});