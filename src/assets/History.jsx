// src/assets/History.jsx (FINAL VERSION)
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, query, limitToLast } from "firebase/database";
import { db } from '../main'; 

function HistoryPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const historyRef = ref(db, 'SmartBag/History');
        const historyQuery = query(historyRef, limitToLast(100)); 

        // onValue เป็น Real-time Listener (จะดึงข้อมูลอัตโนมัติเมื่อมีการ push ข้อมูลใหม่เข้ามา)
        const unsubscribe = onValue(historyQuery, (snapshot) => {
            const data = snapshot.val();
            const fetchedLogs = [];
            
            if (data) {
                // ใช้ Object.entries เพื่อเข้าถึงทั้ง key (ID) และ value (Log Data)
                Object.entries(data).forEach(([key, logData]) => {
                    // ตรวจสอบว่ามี Lat/Lng ก่อนเพิ่มลงใน Log (ตามเงื่อนไขของโค้ด ESP32)
                    if (logData.lat && logData.lng) {
                        fetchedLogs.push({
                            key: key,
                            ...logData,
                            // ใช้ timestamp ที่ ESP32 ส่งมาโดยตรง (เป็น String เช่น "14:50:30")
                            timestampDisplay: logData.timestamp || 'N/A'
                        });
                    }
                });
            }
            
            // เรียงลำดับจากใหม่ไปเก่า
            fetchedLogs.reverse(); 
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Firebase History Error:", error);
            setLoading(false);
        });
        
        // Cleanup function สำหรับยกเลิกการฟัง Real-time เมื่อ component ถูกทำลาย
        return () => unsubscribe(); 
    }, []);

    if (loading) {
        return <div className="page-content" style={{textAlign:'center', marginTop:'50px'}}>กำลังโหลดประวัติ...</div>;
    }


    return (
        <div className="page-content">
            
            <div className="header-section">
                <div>
                    <h1>📜 ประวัติการเคลื่อนที่ (Log)</h1>
                    <p style={{color:'var(--muted)', fontSize:'1rem'}}>แสดงข้อมูลพิกัดล่าสุด 100 รายการที่ถูกบันทึกไว้</p>
                </div>
                <div className={`status-pill online`}>
                    <span>✅ ข้อมูลเรียลไทม์จาก Firebase</span>
                </div>
            </div>

            {/* Table Container - จัดให้อยู่ใน Card */}
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
                                {/* ใช้ timestampDisplay ที่ดึงมาโดยตรง */}
                                <td style={{color:'var(--text)', fontWeight:'600'}}>{log.timestampDisplay || 'N/A'}</td>
                                <td>{log.lat?.toFixed(6) || '--'}</td>
                                <td>{log.lng?.toFixed(6) || '--'}</td>
                                <td>
                                    {/* แสดงความเร็วพร้อมหน่วย */}
                                    <span style={{fontWeight:'bold'}}>{(log.speed || 0).toFixed(1)} km/h</span>
                                </td>
                                <td style={{color: log.isSafe ? 'var(--success)' : 'var(--danger)', fontWeight:'600'}}>
                                    {log.isSafe ? 'ปลอดภัย' : 'แจ้งเตือน'}
                                </td>
                                <td>
                                    {log.lat && log.lng ? (
                                        <a 
    href={`https://www.google.com/maps/search/?api=1&query=${log.lat},${log.lng}`} 
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
                                    ยังไม่มีประวัติการบันทึก (รอข้อมูลจาก ESP32 หรือ Path ผิดพลาด)
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