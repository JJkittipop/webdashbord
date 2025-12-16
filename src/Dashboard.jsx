import React, { useState, useEffect } from "react";
// ลบ import ของ leaflet ออกเพราะเราเปลี่ยนไปใช้ Google Maps Iframe แล้ว
import { ref, onValue, set } from "firebase/database";
import { db } from "./main";

export default function DashboardPage() {
  const [systemData, setSystemData] = useState({
    battery: 85,
    connection_type: "ONLINE (Firebase)",
    isSafe: true,
    last_update: "-",
    speed: 0,
  });

  const [position, setPosition] = useState([13.7563, 100.5018]); // [lat, lng]
  const [hasGPS, setHasGPS] = useState(false);
  const [findMeStatus, setFindMeStatus] = useState(false);

  useEffect(() => {
    // 1. ดึงข้อมูลสถานะ (Status)
    const statusRef = ref(db, "SmartBag/Status");
    const unsubStatus = onValue(statusRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      setSystemData({
        battery: data.battery ?? 85,
        connection_type: "ONLINE (Firebase)",
        isSafe: data.isSafe,
        last_update: data.timestamp
          ? new Date(data.timestamp).toLocaleTimeString("th-TH")
          : "-",
        speed: data.speed ?? 0,
      });

      if (data.lat && data.lng) {
        setPosition([data.lat, data.lng]);
        setHasGPS(true);
      } else {
        setHasGPS(false);
      }
    });

    // 2. ดึงข้อมูลปุ่ม Find Me
    const cmdRef = ref(db, "SmartBag/Commands/findMe");
    const unsubCmd = onValue(cmdRef, (snap) => {
      setFindMeStatus(snap.val() === true);
    });

    return () => {
      unsubStatus();
      unsubCmd();
    };
  }, []);

  const toggleFindMe = (on) => {
    set(ref(db, "SmartBag/Commands/findMe"), on);
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
          <div className={`status ${hasGPS ? "is-success" : "is-error"}`} style={{backgroundColor: hasGPS ? '#d1fae5' : '#fee2e2', color: hasGPS ? '#065f46' : '#991b1b', border: hasGPS ? '1px solid #10b981' : '1px solid #ef4444'}}>
             {hasGPS ? "ออนไลน์ (ปกติ)" : "รอสัญญาณ GPS"}
          </div>
          <span className="status-detail">
             {hasGPS ? "Data Received" : "Waiting for fix..."}
          </span>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="dashboard">
        {/* LEFT – STATUS */}
        <div className="card main-status-card">
          <div className="card-title">⚙️ สรุปสถานะโดยรวม</div>

          <div className="main-stats-row">
            <div>
              <div className="big">{systemData.battery}%</div>
              <div className="sub-detail-row">แบตเตอรี่คงเหลือ</div>
            </div>

            <div className="safety-status-value" style={{ color: systemData.isSafe ? 'var(--success)' : 'var(--danger)' }}>
              {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
            </div>
          </div>

          <div className="sub-stats-row">
            <div className="sub-stat-item">
              <span className="sub-label">ความเร็ว GPS</span>
              <span className="sub-value">
                {systemData.speed.toFixed(1)} km/h
              </span>
            </div>

            <div className="sub-stat-item">
              <span className="sub-label">การเชื่อมต่อ</span>
              <span className="sub-value">{systemData.connection_type}</span>
            </div>
          </div>
        </div>

        {/* LEFT – FIND ME */}
        <div className="card">
          <div className="card-title">🔊 Find Me (ค้นหากระเป๋า)</div>
          {findMeStatus ? (
            <button
              className="btn"
              style={{ backgroundColor: "#ef4444" }}
              onClick={() => toggleFindMe(false)}
            >
              หยุดส่งเสียง
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => toggleFindMe(true)}
            >
              สั่งให้ส่งเสียง
            </button>
          )}
        </div>

        {/* LEFT – HISTORY (ย่อ) */}
        <div className="card history-card">
          <div className="history-header">
            <h3>📜 ประวัติการทำงานล่าสุด</h3>
          </div>

          <div className="history-list">
            <div className="history-item">
              <div>
                <div className="history-title">อัปเดตล่าสุด</div>
                <div className="history-time">{systemData.last_update}</div>
              </div>
              <span className="history-status success">Active</span>
            </div>
          </div>
        </div>

        {/* RIGHT – MAP (เปลี่ยนเป็น Google Maps Iframe) */}
        <div className="card map-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header ของ Map */}
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', background: '#fff', zIndex: 10 }}>
            <div className="card-title map-title" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📍 ตำแหน่งปัจจุบัน</span>
              <span className="gps-text" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                {hasGPS
                  ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                  : "กำลังค้นหาพิกัด..."}
              </span>
            </div>
          </div>

          {/* Map Area */}
          <div className="map-box" style={{ flex: 1, minHeight: '400px', backgroundColor: '#e5e7eb', position: 'relative' }}>
            {hasGPS ? (
              <iframe
                title="Realtime Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                // ลิงก์ Embed Google Maps (ใช้ Lat/Lng จาก State)
                src={`https://maps.google.com/maps?q=${position[0]},${position[1]}&z=15&output=embed`}
              ></iframe>
            ) : (
              // หน้าจอรอกรณีไม่มีสัญญาณ GPS
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%', 
                color: '#6b7280' 
              }}>
                <span style={{ fontSize: '3rem', marginBottom: '10px' }}>📡</span>
                <p>รอสัญญาณ GPS จากอุปกรณ์...</p>
                <small>กรุณานำอุปกรณ์ออกไปที่โล่งแจ้ง</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}