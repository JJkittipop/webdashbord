import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// --- Import Firebase ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// --- Fix Leaflet Icon ---
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// ==========================================
// 1. Config Firebase
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB0-_1YZihd8lpjsNMEaP8Jg-FAkcfMF8I",
  authDomain: "smartbagproject-10842.firebaseapp.com",
  databaseURL: "https://smartbagproject-10842-default-rtdb.firebaseio.com",
  projectId: "smartbagproject-10842",
  storageBucket: "smartbagproject-10842.firebasestorage.app",
  messagingSenderId: "474095438323",
  appId: "1:474095438323:web:9660e4728e759ebb0aaa86",
  measurementId: "G-CTBGP61Q68"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 2. Dashboard Component (ภาษาไทยล้วน)
// ==========================================
function DashboardPage() {
  const [systemData, setSystemData] = useState({
    battery: 0,
    connection_type: "กำลังตรวจสอบ...", 
    hardware_status: "กำลังเริ่มระบบ...",
    last_update: "-"
  });

  const [position, setPosition] = useState([13.7563, 100.5018]);
  const [hasGPS, setHasGPS] = useState(false);

  useEffect(() => {
    // ดึงค่า Device Status
    onValue(ref(db, 'device_status'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSystemData(data);
    });

    // ดึงค่า GPS
    onValue(ref(db, 'gps_location'), (snapshot) => {
      const data = snapshot.val();
      if (data && data.lat && data.lng) {
        setPosition([data.lat, data.lng]);
        setHasGPS(true);
      }
    });
  }, []);

  const sendCommand = (cmd) => {
    set(ref(db, 'command'), cmd);
    const msg = cmd === 'SOS_ON' ? 'เปิดสัญญาณเตือนภัย!' : 'ปิดเสียงสัญญาณแล้ว';
    alert(`⚡ สถานะ: ${msg}`);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="header-section">
        <div>
          <h1>ศูนย์ควบคุมอัจฉริยะ</h1>
          <p style={{color:'var(--text-muted)', fontSize:'1.1rem'}}>Smart Bag Monitoring System</p>
        </div>
        <div className={`status-pill ${systemData.hardware_status === 'Init...' ? 'offline' : 'online'}`}>
          <span className="pulsing-dot"></span> 
          {systemData.connection_type === 'Strong' ? 'สัญญาณ 4G ดีเยี่ยม' : 'เชื่อมต่อระบบแล้ว'}
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        
        {/* --- Column 1: สถานะ & ปุ่มกด --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Battery */}
            <div className="card">
                <div className="card-header"><span style={{fontSize:'1.5rem'}}>🔋</span> แบตเตอรี่</div>
                <div style={{display:'flex', alignItems:'baseline', gap:'15px'}}>
                  <p className="card-value">{systemData.battery}%</p>
                  <span style={{fontSize:'1.2rem', color: systemData.battery > 20 ? 'var(--success)' : 'var(--danger)'}}>
                    {systemData.battery > 20 ? 'สถานะปกติ' : 'แบตเตอรี่ต่ำ'}
                  </span>
                </div>
            </div>

            {/* Connection */}
            <div className="card">
                <div className="card-header"><span style={{fontSize:'1.5rem'}}>📡</span> เครือข่าย</div>
                <p className="card-value" style={{fontSize:'2.5rem'}}>
                  {systemData.connection_type || "รอการเชื่อมต่อ"}
                </p>
                <p className="card-sub" style={{color:'var(--success)'}}>เชื่อมต่อผ่าน AIS IoT 4G</p>
            </div>

            {/* Controls */}
            <div className="card" style={{marginTop:'auto', border:'1px solid var(--primary)', background:'rgba(56, 189, 248, 0.05)'}}>
                <div className="card-header" style={{color:'white'}}>🎛️ แผงควบคุมฉุกเฉิน</div>
                <div style={{display:'flex', gap:'15px', flexDirection:'column'}}>
                  <button className="btn btn-alert" onClick={() => sendCommand('SOS_ON')}>
                    🚨 เปิดเสียงไซเรน (SOS)
                  </button>
                  <button className="btn btn-normal" onClick={() => sendCommand('SOS_OFF')}>
                    🔕 ปิดเสียงสัญญาณ
                  </button>
                </div>
            </div>
        </div>

        {/* --- Column 2: แผนที่ --- */}
        <div className="card" style={{ minHeight: '500px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{justifyContent:'space-between'}}>
              <span>📍 ตำแหน่งปัจจุบัน</span>
              <span style={{fontSize:'0.9rem', color:'var(--primary)'}}>
                {hasGPS ? `พิกัด: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'กำลังค้นหาสัญญาณ GPS...'}
              </span>
            </div>
            
            <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', position: 'relative', border:'1px solid var(--card-border)' }}>
               <MapContainer 
                  key={`${position[0]}-${position[1]}`} 
                  center={position} 
                  zoom={15} 
                  style={{ height: "100%", width: "100%" }}
               >
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                  <Marker position={position}>
                    <Popup>🎒 กระเป๋าอยู่ตรงนี้!</Popup>
                  </Marker>
               </MapContainer>
            </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. History Page (แปลไทยครบ)
// ==========================================
function HistoryPage() {
  // ข้อมูลจำลอง (Mock Log) เป็นภาษาไทย
  const logs = [
    { time: "14:30:05", event: "เปิดเครื่อง", detail: "เริ่มต้นระบบ ESP32, ตรวจสอบเซ็นเซอร์ครบถ้วน" },
    { time: "14:30:10", event: "เชื่อมต่อเครือข่าย", detail: "เชื่อมต่อ Wi-Fi (SmartHome_5G) สำเร็จ" },
    { time: "15:10:00", event: "ตรวจสอบพลังงาน", detail: "ระดับแบตเตอรี่คงเหลือ 90%" },
    { time: "15:45:00", event: "อัปเดตพิกัด", detail: "ส่งข้อมูล GPS ขึ้นระบบ Cloud สำเร็จ" },
  ];

  return (
    <div className="page-content">
      <div className="header-section">
        <h1>📜 ประวัติการทำงาน</h1>
      </div>
      <div className="card" style={{padding:'0', overflow:'hidden'}}>
        <table className="history-table">
          <thead>
            <tr>
              <th style={{width:'150px'}}>เวลา</th>
              <th style={{width:'200px'}}>เหตุการณ์</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td style={{color:'var(--primary)', fontWeight:'bold'}}>{log.time}</td>
                <td style={{fontWeight:'600'}}>{log.event}</td>
                <td style={{color:'var(--text-muted)'}}>{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// Main App & NavBar (แก้โลโก้)
// ==========================================
function NavBar() {
  const location = useLocation();
  return (
    <nav className="navbar">
      {/* แยก Emoji กับ Text ออกจากกัน เพื่อไม่ให้ Gradient บัง Emoji */}
      <div className="nav-brand">
        <span style={{fontSize:'2rem'}}>🎒</span> 
        <span className="brand-text">Smart Bag Pro</span>
      </div>
      
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>หน้าหลัก</Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>ประวัติ</Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <NavBar />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App;