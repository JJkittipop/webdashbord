import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./main";
import "./App.css";

export default function DashboardPage() {
  const [systemData, setSystemData] = useState({
    battery: 85,
    connection_type: "ONLINE (Firebase)",
    isSafe: true,
    last_update: "-",
    speed: 0,
  });

  const [position, setPosition] = useState([13.7563, 100.5018]);
  const [hasGPS, setHasGPS] = useState(false);

  // 🔊 Find Me State
  const [findMeStatus, setFindMeStatus] = useState(false);
  const [loadingFindMe, setLoadingFindMe] = useState(false);

  useEffect(() => {
    // ===== STATUS FROM FIREBASE =====
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

    return () => unsubStatus();
  }, []);

  /* =========================
     FIND ME ผ่าน MQTT SERVER
  ========================= */
  const startFindMe = async () => {
    try {
      setLoadingFindMe(true);
      await fetch("http://localhost:8080/api/start", { method: "POST" });
      setFindMeStatus(true);
    } catch (err) {
      alert("สั่งให้ส่งเสียงไม่สำเร็จ");
    } finally {
      setLoadingFindMe(false);
    }
  };

  const stopFindMe = async () => {
    try {
      setLoadingFindMe(true);
      await fetch("http://localhost:8080/api/stop", { method: "POST" });
      setFindMeStatus(false);
    } catch (err) {
      alert("สั่งหยุดเสียงไม่สำเร็จ");
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
            {hasGPS ? "ออนไลน์ (ปกติ)" : "รอสัญญาณ GPS"}
          </div>
          <span className="status-detail">
            {hasGPS ? "Data Received" : "Waiting for fix..."}
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
              <div className="sub-detail-row">แบตเตอรี่คงเหลือ</div>
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
              <span className="sub-label">ความเร็ว GPS</span>
              <span className="sub-value">
                {systemData.speed.toFixed(1)} km/h
              </span>
            </div>

            <div className="sub-stat-item">
              <span className="sub-label">การเชื่อมต่อ</span>
              <span className="sub-value">
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
