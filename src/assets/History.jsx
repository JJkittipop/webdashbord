import React, { useEffect, useState } from 'react';

function HistoryPage() {
  const [logs, setLogs] = useState([]);

  /* =========================
     FETCH HISTORY (REALTIME)
  ========================= */
  const fetchHistory = async () => {
    try {
      // ✅ ใช้ /api/history เพื่อให้รองรับทั้ง localhost และ Server จริง
      const res = await fetch('/api/history');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History API error', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(fetchHistory, 5000); // ปรับเป็น 5 วิ เพื่อไม่ให้หนัก Server เกินไป
    return () => clearInterval(timer);
  }, []);

  /* =========================
     FORMAT DATE
  ========================= */
  const formatDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short', // ย่อเดือนให้สั้นลงเพื่อประหยัดพื้นที่
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
    if (diff < 60) return `${diff} วิที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  };

  return (
    <div className="page-content">
      <div className="header">
        <h1>📜 ประวัติการเคลื่อนที่ (Log)</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          ข้อมูลย้อนหลัง (ปัดซ้าย-ขวาเพื่อดูข้อมูล)
        </p>
      </div>

      {/* ✅ ส่วนสำคัญ: overflowX: 'auto' ทำให้ตารางเลื่อนแนวนอนได้ในมือถือ */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        
        {/* minWidth: 600px เพื่อกันไม่ให้ตารางบีบตัวจนพัง */}
        <table className="history-table" style={{ width: '100%', minWidth: '600px', whiteSpace: 'nowrap' }}>
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
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {formatTime(log.created_at)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatDate(log.created_at)} ({timeAgo(log.created_at)})
                  </div>
                </td>

                <td>{Number(log.lat).toFixed(5)}</td>
                <td>{Number(log.lng).toFixed(5)}</td>
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
                  {/* ✅ แก้ไขลิงก์ Google Maps ให้ถูกต้องและกดง่ายขึ้น */}
                  <a
                    href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ 
                      display: 'inline-block',
                      color: '#2563eb', 
                      fontWeight: 600,
                      background: '#eff6ff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    🗺 เปิด Map
                  </a>
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                  ยังไม่มีข้อมูลประวัติ...
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