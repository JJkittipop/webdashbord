import React, { useEffect, useState } from 'react';

function HistoryPage() {
  const [logs, setLogs] = useState([]);

  /* =========================
     FETCH HISTORY (REALTIME)
  ========================= */
  const fetchHistory = async () => {
    try {
      // ✅ แก้ไข 1: เปลี่ยนจาก http://localhost:8080... เป็น /api/history 
      // (เพื่อให้ใช้ได้ทั้งบนคอมและบน Server จริง)
      const res = await fetch('/api/history');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History API error', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(fetchHistory, 2000);
    return () => clearInterval(timer);
  }, []);

  /* =========================
     FORMAT DATE
  ========================= */
  const formatDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /* =========================
     FORMAT TIME
  ========================= */
  const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /* =========================
     RELATIVE TIME
  ========================= */
  const timeAgo = (value) => {
    if (!value) return '';
    const diff = Math.floor((Date.now() - new Date(value)) / 1000);
    if (diff < 5) return 'เมื่อกี้';
    if (diff < 60) return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  };

  return (
    <div className="page-content">
      <h1>📜 ประวัติการเคลื่อนที่ (Log)</h1>
      <p style={{ color: '#6b7280' }}>
        Live จาก MQTT → Node.js → MySQL
      </p>

      <div className="card" style={{ padding: 0 }}>
        <table className="history-table">
          <thead>
            <tr>
              <th>วัน / เวลา</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>RSSI</th>
              <th>สถานะ</th>
              <th>แผนที่</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, i) => (
              <tr
                key={i}
                style={{
                  background: i === 0 ? '#ecfeff' : 'transparent'
                }}
              >
                {/* ===== DATE & TIME COLUMN ===== */}
                <td>
                  {/* วันที่ */}
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatDate(log.created_at)}
                  </div>

                  {/* เวลา */}
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {formatTime(log.created_at)}
                  </div>

                  {/* เมื่อกี้ */}
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {timeAgo(log.created_at)}
                  </div>
                </td>

                <td>{Number(log.lat).toFixed(6)}</td>
                <td>{Number(log.lng).toFixed(6)}</td>
                <td>{log.rssi}</td>

                <td
                  style={{
                    fontWeight: 700,
                    color: log.state === 'WARN' ? '#dc2626' : '#16a34a'
                  }}
                >
                  {log.state}
                </td>

                <td>
                  {/* ✅ แก้ไข 2: ลิงก์ Google Maps ให้ถูกต้อง */}
                  <a
                    href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', fontWeight: 600 }}
                  >
                    🗺 เปิด
                  </a>
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 30 }}>
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoryPage;