const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// ==============================================================
// ⚙️ إعدادات CASTLEBREAKER 
// ==============================================================
const CB_API_KEY = "PUT_YOUR_API_KEY_HERE"; 
const CB_PROXY = "http://user:pass@ip:port"; 
const TARGET_URL = "https://www.blsspainmorocco.net/MAR/Appointment/SlotSelection";
const SITE_KEY = "6Leka3csAAAAACIRdkx6wW2i9tKQyCfdojBopbwH";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let tokenBank = [];
let globalAutoFire = true; // 🔴 المتغير المركزي للتحكم في الطلب الأول

// ==============================================================
// 🎛️ واجهة التحكم المرئية على متصفحك (Dashboard)
// ==============================================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>HIVE-MIND COMMAND</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #050505; color: #f8fafc; font-family: 'Segoe UI', monospace; text-align: center; padding: 50px; margin: 0; }
                h1 { color: #dc2626; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; }
                .card { background: #111; border: 2px solid #dc2626; border-radius: 12px; padding: 40px; display: inline-block; box-shadow: 0 0 40px rgba(220,38,38,0.3); }
                .switch { position: relative; display: inline-block; width: 80px; height: 40px; margin-top: 20px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 40px; border: 2px solid #555; }
                .slider:before { position: absolute; content: ""; height: 30px; width: 30px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: rgba(16, 185, 129, 0.2); border-color: #10b981; }
                input:checked + .slider:before { transform: translateX(40px); background-color: #10b981; box-shadow: 0 0 15px #10b981; }
                .status { margin-top: 30px; font-weight: 900; font-size: 20px; letter-spacing: 1px; color: ${globalAutoFire ? '#10b981' : '#ef4444'}; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>⚔️ HIVE-MIND COMMAND</h1>
                <p style="color:#888; font-family: sans-serif; font-size: 14px;">Toggle Auto-Fire (5.8s Request) across all connected bots globally.</p>
                <label class="switch">
                    <input type="checkbox" id="autoFireToggle" ${globalAutoFire ? 'checked' : ''} onchange="toggleState()">
                    <span class="slider"></span>
                </label>
                <div id="statusText" class="status">${globalAutoFire ? 'AUTO-FIRE: ENABLED ⚡' : 'AUTO-FIRE: DISABLED ⏸️'}</div>
            </div>
            <script>
                function toggleState() {
                    fetch('/toggle-autofire', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                            const status = document.getElementById('statusText');
                            if (data.autoFire) {
                                status.textContent = 'AUTO-FIRE: ENABLED ⚡'; status.style.color = '#10b981';
                            } else {
                                status.textContent = 'AUTO-FIRE: DISABLED ⏸️'; status.style.color = '#ef4444';
                            }
                        });
                }
            </script>
        </body>
        </html>
    `);
});

// استقبال أمر التغيير من واجهة التحكم وبثه للمتصفحات
app.post('/toggle-autofire', (req, res) => {
    globalAutoFire = !globalAutoFire;
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "CONFIG_UPDATE", autoFire: globalAutoFire }));
        }
    });
    res.json({ autoFire: globalAutoFire });
});

// ==============================================================
// 🏦 جلب التوكنات (نفس المنطق السابق)
// ==============================================================
async function fetchFreshToken() {
    try {
        const res = await fetch("https://castlebreaker.cc/getRecaptchaV3", {
            method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": CB_API_KEY },
            body: JSON.stringify({ url: TARGET_URL, sitekey: SITE_KEY, action: "SlotSelection", enterprise: true, proxy: CB_PROXY })
        });
        const data = await res.json();
        if (data.status === "success" && data.data) return data.data.token;
    } catch (e) {} return null;
}

setInterval(() => {
    const now = Date.now();
    tokenBank = tokenBank.filter(t => (now - t.timestamp) < 110000);
    const needed = 4 - tokenBank.length;
    if (needed > 0) {
        for (let i = 0; i < needed; i++) {
            fetchFreshToken().then(token => {
                if (token) { tokenBank.push({ token, timestamp: Date.now() }); console.log(`[+] Token Harvested. Bank: ${tokenBank.length}`); }
            });
        }
    }
}, 15000);

// ==============================================================
// 📡 الويب سوكيت (إرسال الإعدادات فور الاتصال)
// ==============================================================
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // 🔴 إرسال حالة Auto-Fire الحالية فور اتصال المتصفح
    ws.send(JSON.stringify({ type: "CONFIG_UPDATE", autoFire: globalAutoFire }));

    ws.on('message', (message) => {
        try {
            const strMsg = message.toString().trim();
            let action = (strMsg === "FIRE_SLOT") ? "FIRE_SLOT" : JSON.parse(strMsg).action;

            if (action === "FIRE_SLOT") {
                console.log(`[⚡] STRIKE SIGNAL! Broadcasting...`);
                wss.clients.forEach(client => { if (client !== ws && client.readyState === 1) client.send("FIRE_SLOT"); });
            } 
            else if (action === "GET_TOKEN") {
                if (tokenBank.length > 0) {
                    const freshest = tokenBank.pop(); 
                    ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token: freshest.token }));
                } else {
                    fetchFreshToken().then(token => { if (token) ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token })); });
                }
            }
        } catch(e) {}
    });
});

const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false; ws.ping();
    });
}, 25000);

wss.on('close', () => clearInterval(heartbeatInterval));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`⚔️ SAMURAI HIVE-MIND RUNNING ON PORT ${PORT}`));
