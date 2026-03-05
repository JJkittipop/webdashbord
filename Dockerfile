FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 🔥 บรรทัดนี้สำคัญที่สุด: เพื่อสร้างโฟลเดอร์ dist ใหม่จากโค้ด wss:// ที่คุณแก้ไว้
RUN npm run build 

# ติดตั้งเครื่องมือสำหรับรันหน้าเว็บ
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]