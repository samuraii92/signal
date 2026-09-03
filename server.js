const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// ==============================================================
// ⚙️ إعدادات CASTLEBREAKER 
// ==============================================================
const CB_API_KEY = "6f725d06d9dd9310beee824a7b7a4bbc"; 
const CB_PROXY = "socks5h://user-spngko4on6-country-ma:bS3nvWv3_wZin1nwZ4@gate.decodo.com:7000"; 
const TARGET_URL = "https://www.blsspainmorocco.net/MAR/Appointment/SlotSelection";
const SITE_KEY = "6Leka3csAAAAACIRdkx6wW2i9tKQyCfdojBopbwH";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let tokenBank = [];
let globalAutoFire = true; 
let targetBankSize = 0; // 🔴 يبدأ بصفر لكي لا تخسر أموالك
let sessionTokensBurned = 0; // عداد لحساب كم توكن استهلكت لتعرف تكلفتك

// ==============================================================
// 🎛️ واجهة تحكم السيرفر (الاقتصاد + التحكم)
// ==============================================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
            <title>SAMURAI HIVE-MIND COMMAND</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #050505; color: #f8fafc; font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; padding: 40px 10px; margin: 0; }
                .card { background: #111; border: 2px solid #dc2626; border-radius: 12px; padding: 30px; width: 100%; max-width: 500px; box-shadow: 0 0 40px rgba(220,38,38,0.3); }
                h1 { color: #dc2626; text-transform: uppercase; font-weight: 900; text-align: center; font-size: 24px; margin-top: 0; }
                
                .stat-box { background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .stat-value { font-size: 24px; font-weight: 900; color: #10b981; font-family: monospace; }
                
                .slider-container { margin: 30px 0; background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #333; }
                .slider-container label { font-weight: bold; color: #aaa; text-transform: uppercase; font-size: 12px; display: block; margin-bottom: 15px; }
                input[type=range] { width: 100%; cursor: pointer; accent-color: #dc2626; }
                .range-val { text-align: center; font-size: 28px; font-weight: 900; color: #f59e0b; margin-top: 10px; font-family: monospace;}
                
                .switch-row { display: flex; justify-content: space-between; align-items: center; background: #1a1a1a; padding: 15px 20px; border-radius: 8px; border: 1px solid #333; }
                .switch { position: relative; display: inline-block; width: 60px; height: 30px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 30px; }
                .slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: #10b981; }
                input:checked + .slider:before { transform: translateX(30px); }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>⚔️ COMMAND CENTER</h1>
                
                <div class="stat-box">
                    <span style="font-weight: bold; color: #aaa;">Connected Snipers:</span>
                    <span id="ui-clients" class="stat-value" style="color: #3b82f6;">0</span>
                </div>
                
                <div class="stat-box">
                    <span style="font-weight: bold; color: #aaa;">Tokens Ready (Bank):</span>
                    <span id="ui-bank" class="stat-value">0</span>
                </div>
                
                <div class="stat-box">
                    <span style="font-weight: bold; color: #aaa;">Tokens Spent ($):</span>
                    <span id="ui-spent" class="stat-value" style="color: #ef4444;">0</span>
                </div>

                <div class="slider-container">
                    <label>🎯 Target Bank Size (0 = Save Money)</label>
                    <input type="range" id="bankSlider" min="0" max="25" value="${targetBankSize}" onchange="updateConfig()">
                    <div id="sliderVal" class="range-val">${targetBankSize}</div>
                    <p style="font-size:11px; color:#666; text-align:center; margin-top:10px; margin-bottom:0;">Set to 0 when sleeping. Set to 5-10 before the drop.</p>
                </div>

                <div class="switch-row">
                    <span style="font-weight: bold; color: #aaa; text-transform:uppercase; font-size:13px;">Auto-Fire (First Request)</span>
                    <label class="switch">
                        <input type="checkbox" id="autoFireToggle" ${globalAutoFire ? 'checked' : ''} onchange="updateConfig()">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <script>
                // تحديث القيم الحية للواجهة
                document.getElementById('bankSlider').addEventListener('input', (e) => { document.getElementById('sliderVal').textContent = e.target.value; });

                function updateConfig() {
                    const newBank = document.getElementById('bankSlider').value;
                    const newFire = document.getElementById('autoFireToggle').checked;
                    fetch('/api/config', { 
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetBankSize: parseInt(newBank), autoFire: newFire })
                    });
                }

                function fetchStats() {
                    fetch('/api/stats').then(r => r.json()).then(data => {
                        document.getElementById('ui-clients').textContent = data.clients;
                        document.getElementById('ui-bank').textContent = data.bankCount + ' / ' + data.targetBank;
                        document.getElementById('ui-spent').textContent = data.spent;
                        if(document.activeElement !== document.getElementById('bankSlider')){
                            document.getElementById('bankSlider').value = data.targetBank;
                            document.getElementById('sliderVal').textContent = data.targetBank;
                            document.getElementById('autoFireToggle').checked = data.autoFire;
                        }
                    });
                }
                setInterval(fetchStats, 2000); // تحديث الأرقام كل ثانيتين
            </script>
        </body>
        </html>
    `);
});

// API لاستقبال التحديثات من لوحة التحكم
app.post('/api/config', express.json(), (req, res) => {
    if (req.body.targetBankSize !== undefined) targetBankSize = req.body.targetBankSize;
    if (req.body.autoFire !== undefined) {
        globalAutoFire = req.body.autoFire;
        wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify({ type: "CONFIG_UPDATE", autoFire: globalAutoFire })); });
    }
    res.json({ success: true });
});

// API لإرسال الإحصائيات الحية للوحة
app.get('/api/stats', (req, res) => {
    res.json({
        clients: wss.clients.size,
        bankCount: tokenBank.length,
        targetBank: targetBankSize,
        autoFire: globalAutoFire,
        spent: sessionTokensBurned
    });
});

// ==============================================================
// 🏦 نظام جلب التوكنات الاقتصادي (Smart Token Economy)
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

// ♻️ محرك الصيانة: يحرق القديم ويجلب الجديد حسب الرقم الذي حددته أنت في الواجهة
setInterval(() => {
    const now = Date.now();
    // حرق التوكنات التي مر عليها دقيقة و 50 ثانية
    tokenBank = tokenBank.filter(t => (now - t.timestamp) < 110000);
    
    // جلب توكنات جديدة فقط إذا كان الخزان أقل من الرقم المستهدف (targetBankSize)
    const needed = targetBankSize - tokenBank.length;
    if (needed > 0) {
        // حماية: جلب 4 توكنات كحد أقصى في كل دورة حتى لا ينحظر السيرفر من Castlebreaker
        const batchSize = Math.min(needed, 4); 
        for (let i = 0; i < batchSize; i++) {
            sessionTokensBurned++; // زيادة العداد لمعرفة استهلاكك
            fetchFreshToken().then(token => {
                if (token) { 
                    tokenBank.push({ token, timestamp: Date.now() }); 
                    console.log(`[+] Harvested. Bank: ${tokenBank.length}/${targetBankSize}`); 
                }
            });
        }
    }
}, 10000); // الفحص يتم كل 10 ثواني

// ==============================================================
// 📡 الويب سوكيت (إدارة المتصفحات وتوزيع التوكنات)
// ==============================================================
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.send(JSON.stringify({ type: "CONFIG_UPDATE", autoFire: globalAutoFire }));

    ws.on('message', (message) => {
        try {
            const strMsg = message.toString().trim();
            let action = (strMsg === "FIRE_SLOT") ? "FIRE_SLOT" : JSON.parse(strMsg).action;

            if (action === "FIRE_SLOT") {
                console.log(`[⚡] STRIKE SIGNAL! Broadcasting to ${wss.clients.size - 1} bots...`);
                wss.clients.forEach(client => { if (client !== ws && client.readyState === 1) client.send("FIRE_SLOT"); });
            } 
            else if (action === "GET_TOKEN") {
                // 1. إذا كان الخزان يحتوي على توكن، أعطه فوراً (0 ثانية تأخير)
                if (tokenBank.length > 0) {
                    const freshest = tokenBank.pop(); 
                    ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token: freshest.token }));
                    console.log(`[✔] Delivered from Bank. Remaining: ${tokenBank.length}`);
                } 
                // 2. حالة الطوارئ (Emergency): دخلت صفحات أكثر من التوكنات المتاحة
                else {
                    console.log(`[!] Bank empty. Emergency Fetch Triggered!`);
                    sessionTokensBurned++; // حساب الاستهلاك
                    fetchFreshToken().then(token => { 
                        if (token) {
                            ws.send(JSON.stringify({ type: "TOKEN_DELIVERY", token }));
                            console.log(`[✔] Emergency Token Delivered.`);
                        }
                    });
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
