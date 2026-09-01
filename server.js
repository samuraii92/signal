const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// 1. إنشاء سيرفر HTTP خفيف لإرضاء منصة Render وإبقاء الخدمة حية
const app = express();
app.get('/', (req, res) => {
    res.send('⚔️ SAMURAI HIVE-MIND SERVER IS ONLINE AND LISTENING... ⚔️');
});

// 2. دمج سيرفر الويب مع سيرفر الـ WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 3. المنطق الخارق لسرعة الاستجابة
wss.on('connection', (ws) => {
    // تفعيل ميكانيزم إبقاء الاتصال حياً (Heartbeat)
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        // تحويل الرسالة إلى نص وتنظيفها من أي فراغات
        const signal = message.toString().trim();

        // السيرفر لن يستجيب ولن يتشتت إلا إذا كانت الكلمة هي كلمة السر الدقيقة
        if (signal === "FIRE_SLOT") {
            console.log(`[${new Date().toISOString()}] ⚡ STRIKE SIGNAL RECEIVED! Broadcasting to ${wss.clients.size - 1} snipers...`);
            
            // بث الإشارة فوراً لجميع المتصفحات المتصلة (ما عدا المتصفح الذي أرسل الإشارة)
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === 1 /* WebSocket.OPEN */) {
                    client.send("FIRE_SLOT");
                }
            });
        }
    });
});

// 4. نظام النبض (Ping) كل 25 ثانية لمنع Render من قطع الاتصال (Timeout 30s)
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log("💀 Dead sniper connection terminated.");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 25000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// 5. تشغيل السيرفر على البورت الذي تختاره Render (أو 8080 محلياً)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`⚔️ SAMURAI HIVE-MIND IS RUNNING ON PORT ${PORT}`);
});
