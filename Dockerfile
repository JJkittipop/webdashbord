# ใช้ Node.js เวอร์ชัน 18
FROM node:18-alpine

# กำหนดโฟลเดอร์ทำงานใน Container
WORKDIR /usr/src/app

# ก๊อปปี้ไฟล์ package.json เพื่อเตรียมลง Library
COPY package*.json ./

# สั่งลง Library ต่างๆ
RUN npm install

# ก๊อปปี้โค้ดทั้งหมดในโฟลเดอร์เรา เข้าไปใน Container
COPY . .

# เปิด Port 3000
EXPOSE 3000

# คำสั่งรัน Server เมื่อเปิด Container
CMD [ "node", "server.js" ]