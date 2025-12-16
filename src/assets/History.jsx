// src/assets/History.jsx (Updated with Export Feature)
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, query, limitToLast } from "firebase/database";
import { db } from '../main'; 

function HistoryPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const historyRef = ref(db, 'SmartBag/History');
        const historyQuery = query(historyRef, limitToLast(100)); 

        const unsubscribe = onValue(historyQuery, (snapshot) => {
            const data = snapshot.val();
            const fetchedLogs = [];
            
            if (data) {
                Object.entries(data).forEach(([key, logData]) => {
                    if (logData.lat && logData.lng) {
                        fetchedLogs.push({
                            key: key,
                            ...logData,
                            timestampDisplay: logData.timestamp || 'N/A'
                        });
                    }
                });
            }
            
            fetchedLogs.reverse(); 
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Firebase History Error:", error);
            setLoading(false);
        });
        
        return () => unsubscribe(); 
    }, []);

    // --- ฟังก์ชันสำหรับดาวน์โหลดไฟล์ CSV (เพิ่มใหม่ตรงนี้) ---
    const downloadCSV = () => {
        // 1. สร้างหัวตาราง
        const csvRows = [];
        const headers = ["Timestamp", "Latitude", "Longitude", "Speed (km/h)", "Status", "Google Maps Link"];
        csvRows.push(headers.join(","));

        // 2. วนลูปเอาข้อมูลมาใส่ทีละแถว
        logs.forEach(log => {
            const row = [
                `"${log.timestampDisplay}"`, // ใส่ฟันหนูกัน Format เพี้ยน
                log.lat,
                log.lng,
                log.speed,
                log.isSafe ? "Safe" : "Alert",
                `http://googleusercontent.com/maps.google.com/search?api=1&query=${log.lat},${log.lng}`
            ];
            csvRows.push(row.join(","));
        });

        // 3. สร้างไฟล์และสั่งดาวน์โหลด
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartBag_Log_${new Date().toISOString().slice(0,10)}.csv`; // ตั้งชื่อไฟล์ตามวันที่
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="page-content" style={{textAlign:'center', marginTop:'50px'}}>กำลังโหลดประวัติ...</div>;
    }

    return (
        <div className="page-content">
            
            <div className="header-section" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'20px'}}>
                <div>
                    <h1>📜 ประวัติการเคลื่อนที่ (Log)</h1>
                    <p style={{color:'var(--muted)', fontSize:'1rem'}}>แสดงข้อมูลพิกัดล่าสุด 100 รายการที่ถูกบันทึกไว้</p>
                </div>
                
                <div style={{display:'flex', gap:'10px'}}>
                    {/* ปุ่มดาวน์โหลดไฟล์ (เพิ่มใหม่) */}
                    <button 
                        onClick={downloadCSV}
                        className="btn"
                        style={{
                            backgroundColor:'#10b981', // สีเขียว
                            width:'auto', 
                            padding:'10px 20px',
                            display:'flex',
                            alignItems:'center',
                            gap:'8px'
                        }}
                    >
                        📥 บันทึกเป็น Excel
                    </button>

                    <div className={`status-pill online`}>
                        <span>✅ Realtime</span>
                    </div>
                </div>
            </div>

            <div className="card" style={{padding:'0', overflowX:'auto', minHeight:'400px'}}>
                <table className="history-table">
                    <thead>
                        <tr>
                            <th style={{width:'15%'}}>เวลา (Timestamp)</th>
                            <th style={{width:'15%'}}>ละติจูด (Lat)</th>
                            <th style={{width:'15%'}}>ลองจิจูด (Lng)</th>
                            <th style={{width:'10%'}}>ความเร็ว (km/h)</th>
                            <th style={{width:'10%'}}>สถานะ</th>
                            <th style={{width:'35%'}}>แผนที่</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? logs.map((log) => (
                            <tr key={log.key}>
                                <td style={{color:'var(--text)', fontWeight:'600'}}>{log.timestampDisplay || 'N/A'}</td>
                                <td>{log.lat?.toFixed(6) || '--'}</td>
                                <td>{log.lng?.toFixed(6) || '--'}</td>
                                <td>
                                    <span style={{fontWeight:'bold'}}>{(log.speed || 0).toFixed(1)} km/h</span>
                                </td>
                                <td style={{color: log.isSafe ? 'var(--success)' : 'var(--danger)', fontWeight:'600'}}>
                                    {log.isSafe ? 'ปลอดภัย' : 'แจ้งเตือน'}
                                </td>
                                <td>
                                    {log.lat && log.lng ? (
                                        <a 
                                            href={`http://googleusercontent.com/maps.google.com/search?api=1&query=${log.lat},${log.lng}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            style={{color:'var(--primary)', textDecoration:'none', fontWeight:'600'}}
                                        >
                                            🗺️ เปิดพิกัดบน Google Maps
                                        </a>
                                    ) : (
                                        <span style={{color:'var(--muted)'}}>พิกัดไม่สมบูรณ์</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{textAlign:'center', padding:'40px', color:'var(--muted)'}}>
                                    ยังไม่มีประวัติการบันทึก
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