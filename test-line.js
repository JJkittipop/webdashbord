// ไฟล์ test-line.js
import axios from 'axios';

// Token ของคุณ (ที่อยู่ในโค้ดปัจจุบัน)
const LINE_OA_TOKEN = 'l7Rcp9wnBtHvrwJorvkwk/ANQDzvDCTMVwMOOkYvxoVVxTApWMSF63xkzxJbl9HRHuqQ+cQa2ehaZ2akFnKCwatV5R0INBlMKd0c+VfQrpWL7JH0iBiGzitibP5XrFCC0ysMHFo0+N+HaxN4SyxfjgdB04t89/1O/w1cDnyilFU=';
const MY_USER_ID = 'U05a1994ac36df31ff5abf037b9291c82';

async function testSend() {
  console.log(">> กำลังลองยิง LINE...");
  try {
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: MY_USER_ID,
      messages: [{ type: 'text', text: "✅ ทดสอบ! Token นี้ใช้ได้ครับ" }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_OA_TOKEN}`
      }
    });
    console.log("✅ สำเร็จ! Token ปกติ (ไม่ต้องเปลี่ยน)");
  } catch (error) {
    console.error("❌ พัง! Token ผิด หรือ User ID ผิด");
    console.error(error.response ? error.response.data : error.message);
  }
}

testSend();