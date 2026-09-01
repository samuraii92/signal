const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// ==============================================================
// ⚙️ إعدادات CASTLEBREAKER (أدخل بياناتك هنا)
// ==============================================================
const CB_API_KEY = "6f725d06d9dd9310beee824a7b7a4bbc"; 
const CB_PROXY = "socks5h://user-spngko4on6-country-ma:bS3nvWv3_wZin1nwZ4@gate.decodo.com:7000"; // ضع البروكسي الخاص بك
const TARGET_URL = "https://www.blsspainmorocco.net/MAR/Appointment/SlotSelection";
const SITE_KEY = "6Leka3csAAAAACIRdkx6wW2i9tKQyCfdojBopbwH";

// 1. إنشاء سيرفر HTTP خفيف لإرضاء منصة الاستضافة (Render)
const app = express();
app.get('/', (req, res) => res.send('⚔️ SAMURAI HIVE-MIND (SIGNAL + TOKEN BANK) IS ONLINE ⚔️'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ==============================================================
// 🏦 منطق بنك التوكنات (TOKEN HARVESTER)
// ==============================================================
let tokenBank = [];

async function fetchFreshToken() {
    try {
        const res = await fetch("https://castlebreaker.cc/getRecaptchaV3", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": CB_API_KEY },
            body: JSON.stringify({
                url: TARGET_URL,
                sitekey: SITE_KEY,
                action: "SlotSelection",
                enterprise: true,
                proxy: CB_PROXY
            })
        });
        const data = await res.json();
        if (data.status === "success" && data.data) {
            return data.data.token;
        }
    } catch (e) {
        console.error("[-] Token fetch failed:", e.message);
    }
    return null;
}

// محرك الجلب والحرق الأوتوماتيكي (يعمل كل 15 ثانية)
setInterval(() => {
    const now = Date.now();
    // حرق التوكنات التي مر عليها دقيقة و 50 ثانية (110,000 ملي ثانية)
    tokenBank = tokenBank.filter(t => (now - t.timestamp) < 110000);
    
    // جلب توكنات جديدة إذا كان الخزان يحتوي على أقل من 4 توكنات
    const needed = 4 - tokenBank.length;
    if (needed > 0) {
        for (let i = 0; i < needed; i++) {
            fetchFreshToken().then(token => {
                if (token) {
                    tokenBank.push({ token, timestamp: Date.now() });
                    console.log(`[+] Harvested fresh token. Bank size: ${tokenBank.length}`);
                }
            });
        }
    }
}, 15000);

// ==============================================================
// 📡 منطق استقبال الإشارات وتوزيع التوكنات (WEBSOCKET)
// ==============================================================
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const strMsg = message.toString().trim();
            let action = "";

            // التوافقية الشاملة: قراءة الرسالة سواء كانت نصاً عادياً أو JSON
            if (strMsg === "FIRE_SLOT") {
                action = "FIRE_SLOT";
            } else {
                const parsedData = JSON.parse(strMsg);
                action = parsedData.action;
            }

            // ⚡ 1. منطق السينيال (الهجوم المتزامن)
            if (action === "FIRE_SLOT") {
                console.log(`[⚡] STRIKE SIGNAL RECEIVED! Broadcasting to Snipers...`);
                wss.clients.forEach(client => {
                    // بث كلمة FIRE_SLOT كنص صريح ليفهمها MODULE 2 فوراً
                    if (client !== ws && client.readyState === 1 /* WebSocket.OPEN */) {
                        client.send("FIRE_SLOT");
                    }
                });
            }
            
            // 🛡️ 2. منطق توزيع التوكنات
            else if (action === "GET_TOKEN") {
                if (tokenBank.length > 0) {
                    const freshest = tokenBank.pop(); 
                    ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token: freshest.token }));
                    console.log(`[✔] Token delivered to browser. Remaining in bank: ${tokenBank.length}`);
                } else {
                    console.log(`[!] Bank empty. Emergency fetching...`);
                    fetchFreshToken().then(token => {
                        if (token) {
                            ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token }));
                            console.log(`[✔] Emergency token delivered.`);
                        }
                    });
                }
            }
        } catch(e) {
            // تجاهل الرسائل الخاطئة بصمت لعدم إيقاف السيرفر
        }
    });
});

// ==============================================================
// 💓 نظام النبض (HEARTBEAT) لمنع قطع الاتصال من الاستضافة
// ==============================================================
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 25000);

wss.on('close', () => clearInterval(heartbeatInterval));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`⚔️ SAMURAI HIVE-MIND IS RUNNING ON PORT ${PORT}`));
