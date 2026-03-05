import React, { useState, useEffect } from "react";
import mqtt from "mqtt";
import "./App.css";

export default function DashboardPage() {
  const [client, setClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState("Connecting...");

  const [systemData, setSystemData] = useState({
    battery: 85,
    isSafe: true,
    last_update: "-",
  });

  const [position, setPosition] = useState([7.885490, 98.377586]);
  const [hasGPS, setHasGPS] = useState(false);
  const [findMeStatus, setFindMeStatus] = useState(false);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    const mqttUrl = "wss://smartbag.cloud/mqtt";
    const clientId = "WebClient_" + Math.random().toString(16).substr(2, 8);

    const mqttClient = mqtt.connect(mqttUrl, {
      clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    });

    mqttClient.on("connect", () => {
      setMqttStatus("ONLINE (VPS)");
      mqttClient.subscribe("smartbag/gps");
    });

    mqttClient.on("error", () => {
      setMqttStatus("ERROR");
      mqttClient.end();
    });

    mqttClient.on("offline", () => {
      setMqttStatus("OFFLINE");
    });

    mqttClient.on("message", (topic, message) => {
      if (topic === "smartbag/gps") {
        try {
          const data = JSON.parse(message.toString());

          setSystemData((prev) => ({
            ...prev,
            isSafe: data.state === "SAFE",
            last_update: new Date().toLocaleTimeString("th-TH"),
          }));

          if (data.lat && data.lng) {
            setPosition([data.lat, data.lng]);
            setHasGPS(true);
          }

          if (data.buzzer !== undefined) {
            setFindMeStatus(data.buzzer);
          }
        } catch (e) {
          console.error("Parse Error:", e);
        }
      }
    });

    setClient(mqttClient);

    return () => mqttClient.end();
  }, []);

  const toggleFindMe = () => {
    if (!client || !client.connected) {
      alert("⚠️ ยังไม่เชื่อมต่อ MQTT");
      return;
    }

    const cmd = findMeStatus ? "CMD_CLOSE" : "CMD_OPEN";
    client.publish("smartbag/alert", cmd);
    setFindMeStatus(!findMeStatus);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);

    if (client && client.connected) {
      client.publish("smartbag/alert", `VOL:${newVol}`);
    }
  };

  return (
    <div className="page-content">
      <div className="header">
        <div>
          <h1>ศูนย์ควบคุมอัจฉริยะ</h1>
          <h2>Smart Bag Monitoring System Dashboard</h2>
        </div>

        <div className="status-container">
          <div
            className={`status ${
              mqttStatus.includes("ONLINE") ? "is-success" : "is-error"
            }`}
          >
            {mqttStatus}
          </div>

          <span className="status-detail">
            {hasGPS ? "Receiving GPS Data..." : "Waiting for GPS..."}
          </span>
        </div>
      </div>

      <div className="dashboard">
        {/* STATUS CARD */}
        <div className="card main-status-card">
          <div className="card-title">⚙️ สรุปสถานะโดยรวม</div>

          <div className="main-stats-row">
            <div>
              {/* เปลี่ยนสีตัวเลข 85% ตรงนี้ครับ */}
              <div className="big" style={{ color: '#10b981' }}>{systemData.battery}%</div>
              <div className="sub-detail-row">แบตเตอรี่</div>
            </div>

            <div
              className="safety-status-value"
              style={{
                color: systemData.isSafe ? "#22d3ee" : "#ef4444",
              }}
            >
              {systemData.isSafe ? "ปลอดภัย ✓" : "แจ้งเตือน ⚠️"}
            </div>
          </div>

          <div className="sub-stats-row">
            <div>
              <div className="sub-label">อัปเดตล่าสุด</div>
              <div className="sub-value">{systemData.last_update}</div>
            </div>

            <div>
              <div className="sub-label">การเชื่อมต่อ</div>
              <div className="sub-value">4G System</div>
            </div>
          </div>
        </div>

        {/* FIND ME CARD */}
        <div className="card">
          <div className="card-title">🔊 Find Me (ค้นหากระเป๋า)</div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "0.9rem" }}>
              ระดับเสียง: <b>{volume}%</b>
            </label>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              style={{ width: "100%" }}
            />
          </div>

          <button
            className="btn"
            style={{
              background: findMeStatus
                ? "linear-gradient(135deg,#ef4444,#dc2626)"
                : undefined,
            }}
            onClick={toggleFindMe}
          >
            {findMeStatus
              ? "⏹ หยุดส่งเสียง (STOP)"
              : "🔊 สั่งให้ส่งเสียง (START)"}
          </button>
        </div>

        
        {/* MAP CARD */}
        <div className="card map-card">
          <iframe
            title="Realtime Map"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 400 }}
            loading="lazy"
            // แก้ไขบรรทัด src ด้านล่างนี้ให้เป็น URL มาตรฐานของ Google Maps
            src={`https://maps.google.com/maps?q=${position[0]},${position[1]}&z=15&output=embed`}
          />
        </div>
      </div>
    </div>
  );
}