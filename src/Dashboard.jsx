import React, { useState, useEffect } from "react";
// ❌ ลบ Firebase ออก เพราะเราย้ายมาใช้ Server ตัวเองแล้ว
// import { ref, onValue } from "firebase/database";
// import { db } from "./main";
import "./App.css";

export default function DashboardPage() {
  const [systemData, setSystemData] = useState({
    battery: 85, // ค่าเริ่มต้น (เพราะยังไม่มีข้อมูลแบตส่งมา)
    connection_type: "Connecting...",
    isSafe: true,
    last_update: "-",
    speed: 0,
  });

  const [position, setPosition] = useState([13.7563, 100.5018]);
  const [hasGPS, setHasGPS] = useState(false);

  // 🔊 Find Me State
  const [findMeStatus, setFindMeStatus] = useState(false);
  const [loadingFindMe, setLoadingFindMe] = useState(false);

  /* =========================
     ✅ ส่วนใหม่: ดึงข้อมูลจาก Server ของเรา (แทน Firebase)
  ========================= */
  const fetchLastStatus = async () => {
    try {
      // เรียก API ดึงประวัติล่าสุด
      const res = await fetch("/api/history");
      const data = await res.json();

      // ถ้ามีข้อมูลส่งกลับมา
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0]; // เอาตัวล่าสุด (ตัวแรกในอาเรย์)

        setSystemData({
          battery: 85, // (จำลองไว้ก่อน จนกว่า ESP32 จะส่งค่าแบตมาจริง)
          connection_type: "ONLINE (4G MQTT)", // ✅ เปลี่ยนชื่อสถานะตรงนี้
          isSafe: latest.state === "SAFE",
          last_update: latest.created_at 
            ? new Date(latest.created_at).toLocaleTimeString("th-TH") 
            : "-",
          speed: 0, // (รออัปเดตในอนาคต)
        });

        // อัปเดตพิกัดลงแผนที่
        if (latest.lat && latest.lng) {
          setPosition([latest.lat, latest.lng]);
          setHasGPS(true);
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      // กรณีติดต่อ Server ไม่ได้ ให้ขึ้นสถานะ Offline
      setSystemData(prev => ({ ...prev, connection_type: "OFFLINE" }));
    }
  };

  // ✅ ใช้ setInterval เรียกข้อมูลทุกๆ 3 วินาที
  useEffect(() => {
    fetchLastStatus(); // เรียกครั้งแรกทันที
    const interval = setInterval(fetchLastStatus, 3000); // วนลูปทุก 3 วิ
    return () => clearInterval(interval); // เคลียร์เมื่อปิดหน้าเว็บ
  }, []);


  /* =========================
     FIND ME ผ่าน MQTT SERVER
  ========================= */
  const startFindMe = async () => {
    try {
      setLoadingFindMe(true);
      // ✅ ตัด localhost ทิ้ง เหลือแค่ /api/start
      await fetch("/api/start", { method: "POST" });
      setFindMeStatus(true);
      alert("สั่งให้ส่งเสียงสำเร็จ");
    } catch (err) {
      alert("สั่งให้ส่งเสียงไม่สำเร็จ");
      console.error(err);
    } finally {
      setLoadingFindMe(false);
    }
  };

  const stopFindMe = async () => {
    try {
      setLoadingFindMe(true);
      // ✅ ตัด localhost ทิ้ง เหลือแค่ /api/stop
      await fetch("/api/stop", { method: "POST" });
      setFindMeStatus(false);
      alert("หยุดเสียงสำเร็จ");
    } catch (err) {
      alert("สั่งหยุดเสียงไม่สำเร็จ");
      console.error(err);
    } finally {
      setLoadingFindMe(false);
    }
  };

  return (
    <div className="page-content">
      {/* HEADER */}
      <div className="header">
        <div>
          <h1>ศูนย์ควบคุมอัจฉริยะ</h1>
          <h2>Smart Bag Monitoring System Dashboard</h2>
        </div>

        <div className="status-container">
          <div
            className={`status ${hasGPS ? "is-success" : "is-error"}`}
            style={{
              backgroundColor: hasGPS ? "#d1fae5" : "#fee2e2",
              color: hasGPS ? "#065f46" : "#991b1b",
              border: hasGPS
                ? "1px solid #10b981"
                : "1px solid #ef4444",
            }}
          >
            {hasGPS ? "ONLINE (4G)" : "รอสัญญาณ GPS"}
          </div>
          <span className="status-detail">
            {hasGPS ? "Data Received" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="dashboard">
        {/* STATUS CARD */}
        <div className="card main-status-card">
          <div className="card-title">⚙️ สรุปสถานะโดยรวม</div>

          <div className="main-stats-row">
            <div>
              <div className="big">{systemData.battery}%</div>
              <div className="sub-detail-row">แบตเตอรี่ (จำลอง)</div>
            </div>

            <div
              className="safety-status-value"
              style={{
                color: systemData.isSafe
                  ? "var(--success)"
                  : "var(--danger)",
              }}
            >
              {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
            </div>
          </div>

          <div className="sub-stats-row">
            <div className="sub-stat-item">
              <span className="sub-label">อัปเดตล่าสุด</span>
              <span className="sub-value">
                {systemData.last_update}
              </span>
            </div>

            <div className="sub-stat-item">
              <span className="sub-label">การเชื่อมต่อ</span>
              <span className="sub-value" style={{ fontWeight: 'bold', color: '#0284c7' }}>
                {systemData.connection_type}
              </span>
            </div>
          </div>
        </div>

        {/* 🔊 FIND ME CARD */}
        <div className="card">
          <div className="card-title">🔊 Find Me (ค้นหากระเป๋า)</div>

          {findMeStatus ? (
            <button
              className="btn"
              style={{ backgroundColor: "#ef4444" }}
              disabled={loadingFindMe}
              onClick={stopFindMe}
            >
              {loadingFindMe ? "กำลังหยุดเสียง..." : "หยุดส่งเสียง"}
            </button>
          ) : (
            <button
              className="btn"
              disabled={loadingFindMe}
              onClick={startFindMe}
            >
              {loadingFindMe ? "กำลังส่งคำสั่ง..." : "สั่งให้ส่งเสียง"}
            </button>
          )}
        </div>

        {/* HISTORY (ย่อ) */}
        <div className="card history-card">
          <div className="history-header">
            <h3>📜 ประวัติการทำงานล่าสุด</h3>
          </div>

          <div className="history-list">
            <div className="history-item">
              <div>
                <div className="history-title">อัปเดตล่าสุด</div>
                <div className="history-time">
                  {systemData.last_update}
                </div>
              </div>
              <span className="history-status success">Active</span>
            </div>
          </div>
        </div>

        {/* MAP */}
        <div
          className="card map-card"
          style={{ padding: 0, overflow: "hidden" }}
        >
          {/* ✅ แก้ไข 3: ใช้ลิงก์ Maps Embed แบบมาตรฐาน เพื่อให้ชัวร์ว่าขึ้นทุกเครื่อง */}
          <iframe
            title="Realtime Map"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 400 }}
            loading="lazy"
            src={`https://maps.google.com/maps?q=${position[0]},${position[1]}&z=15&output=embed`}
          />
        </div>
      </div>
    </div>
  );
}