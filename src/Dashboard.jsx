import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ref, onValue, set } from "firebase/database";
import { db } from "./main";

/* FIX LEAFLET ICON */
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/* MAP AUTO CENTER */
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

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
  const [findMeStatus, setFindMeStatus] = useState(false);

  useEffect(() => {
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
          <div className="status is-error">ออนไลน์ (มีข้อผิดพลาด)</div>
          <span className="status-detail">Invalid Data</span>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="dashboard">
        {/* LEFT – STATUS */}
        <div className="card main-status-card">
          <div className="card-title">สรุปสถานะโดยรวม</div>

          <div className="main-stats-row">
            <div>
              <div className="big">{systemData.battery}%</div>
              <div className="sub-detail-row">แบตเตอรี่คงเหลือ</div>
            </div>

            <div className="safety-status-value">
              ปลอดภัย ✓
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
          <div className="card-title">Find Me</div>
          {findMeStatus ? (
            <button
              className="btn"
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

        {/* LEFT – HISTORY */}
        <div className="card history-card">
          <div className="history-header">
            <h3>ประวัติการทำงาน</h3>
          </div>

          <div className="history-list">
            <div className="history-item">
              <div>
                <div className="history-title">เชื่อมต่อ GPS สำเร็จ</div>
                <div className="history-time">10:24</div>
              </div>
              <span className="history-status success">ปกติ</span>
            </div>

            <div className="history-item">
              <div>
                <div className="history-title">สัญญาณขาดหาย</div>
                <div className="history-time">09:58</div>
              </div>
              <span className="history-status warning">เตือน</span>
            </div>
          </div>
        </div>

        {/* RIGHT – MAP */}
        <div className="card map-card">
          <div className="card-title map-title">
            <span>📍 ตำแหน่งปัจจุบัน</span>
            <span className="gps-text">
              {hasGPS
                ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                : "รอ GPS"}
            </span>
          </div>

          <div className="map-box">
            <MapContainer center={position} zoom={15}>
              <ChangeView center={position} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {hasGPS && (
                <Marker position={position}>
                  <Popup>
                    Smart Bag <br />
                    อัปเดต: {systemData.last_update}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
