import React, { useState, useEffect } from "react";
// ❌ ลบ Firebase ออก เพราะเราย้ายมาใช้ Server ตัวเองแล้ว
import "./App.css";

export default function DashboardPage() {
  const [systemData, setSystemData] = useState({
    battery: 85, // ค่าเริ่มต้น (จำลอง)
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
      ✅ ส่วนดึงข้อมูลจาก Server (HTTP GET)
  ========================= */
  const fetchLastStatus = async () => {
    try {
      // เรียก API จาก Server Port 8100 ที่เราตั้งไว้
      const res = await fetch("http://localhost:8100/api/history");
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0]; 

        setSystemData({
          battery: 85, 
          connection_type: "ONLINE (4G MQTT)", 
          isSafe: latest.state === "SAFE",
          last_update: latest.created_at 
            ? new Date(latest.created_at).toLocaleTimeString("th-TH") 
            : "-",
          speed: 0, 
        });

        if (latest.lat && latest.lng) {
          setPosition([latest.lat, latest.lng]);
          setHasGPS(true);
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      setSystemData(prev => ({ ...prev, connection_type: "OFFLINE" }));
    }
  };

  useEffect(() => {
    fetchLastStatus(); 
    const interval = setInterval(fetchLastStatus, 3000); 
    return () => clearInterval(interval); 
  }, []);

  /* =========================
      🔊 FIND ME ผ่าน MQTT SERVER (ปรับปรุงใหม่)
  ========================= */
  const startFindMe = async () => {
    try {
      setLoadingFindMe(true);
      // ✅ ระบุ URL เต็มพร้อม Port ของ Server เพื่อให้คำสั่งส่งไปถึง
      await fetch("http://localhost:8100/api/start", { method: "POST" });
      setFindMeStatus(true);
      alert("สั่งให้ส่งเสียงสำเร็จ ✅");
    } catch (err) {
      alert("สั่งให้ส่งเสียงไม่สำเร็จ ❌");
      console.error(err);
    } finally {
      setLoadingFindMe(false);
    }
  };

  const stopFindMe = async () => {
    try {
      setLoadingFindMe(true);
      // ✅ ระบุ URL เต็มพร้อม Port ของ Server
      await fetch("http://localhost:8100/api/stop", { method: "POST" });
      setFindMeStatus(false);
      alert("หยุดเสียงสำเร็จ ✅");
    } catch (err) {
      alert("สั่งหยุดเสียงไม่สำเร็จ ❌");
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
              border: hasGPS ? "1px solid #10b981" : "1px solid #ef4444",
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
                color: systemData.isSafe ? "var(--success)" : "var(--danger)",
              }}
            >
              {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
            </div>
          </div>

          <div className="sub-stats-row">
            <div className="sub-stat-item">
              <span className="sub-label">อัปเดตล่าสุด</span>
              <span className="sub-value">{systemData.last_update}</span>
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
          <button
            className="btn"
            style={{ backgroundColor: findMeStatus ? "#ef4444" : "var(--primary)" }}
            disabled={loadingFindMe}
            onClick={findMeStatus ? stopFindMe : startFindMe}
          >
            {loadingFindMe ? "กำลังส่งคำสั่ง..." : findMeStatus ? "หยุดส่งเสียง" : "สั่งให้ส่งเสียง"}
          </button>
        </div>

        {/* MAP CARD */}
        <div className="card map-card" style={{ padding: 0, overflow: "hidden" }}>
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