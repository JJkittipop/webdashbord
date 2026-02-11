const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// จำลอง Database ง่ายๆ (ของจริงต้องต่อ SQL/Mongo)
let users = {}; 

app.post('/webhook', (req, res) => {
    // 1. รับข้อมูล JSON ที่ LINE ส่งมา (เหมือนในรูปที่คุณแคปมา)
    const event = req.body.events[0];
    
    if (!event) return res.sendStatus(200);

    const type = event.type;
    const userId = event.source.userId; // นี่คือ U3c348... ที่เราอยากได้

    // 2. ถ้าลูกค้าพิมพ์ข้อความมา (เช่นพิมพ์ว่า "เชื่อม id1")
    if (type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim(); // คำที่ลูกค้าพิมพ์

        // เช็คว่าเขาพิมพ์คำว่า "เชื่อม" นำหน้าไหม
        if (text.startsWith('เชื่อม')) {
            const bagId = text.split(' ')[1]; // แยกเอาคำหลัง (เช่น id1)
            
            // 3. บันทึกลง Database
            users[bagId] = userId; 
            console.log(`✅ จับคู่สำเร็จ! กระเป๋า ${bagId} เป็นของ ${userId}`);

            // 4. ตอบกลับไลน์ลูกค้าว่า "เชื่อมต่อเรียบร้อย"
            replyMessage(event.replyToken, `เชื่อมต่อกระเป๋า ${bagId} เรียบร้อยครับ!`);
        }
    }
    
    res.sendStatus(200);
});

// ฟังก์ชันตอบกลับ (Reply)
const LINE_ACCESS_TOKEN = 'ใส่_TOKEN_ยาวๆ_ของคุณตรงนี้';
async function replyMessage(replyToken, text) {
    await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken: replyToken,
        messages: [{ type: 'text', text: text }]
    }, {
        headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
    });
}

app.listen(3000, () => console.log('Server running on port 3000'));