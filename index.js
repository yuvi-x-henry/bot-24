// =============================== //  HENRY-X BOT PANEL 2025 🚀 //  FULL UPDATED VERSION — v2 (24x7 reconnect + confirmations) // ===============================

const express = require("express"); const bodyParser = require("body-parser"); const fs = require("fs"); const login = require("ws3-fca"); const path = require("path"); const multer = require("multer");

const app = express(); const PORT = process.env.PORT || 10000;

let activeBots = []; const addUIDs = ["61578298101496", "61581116120393"]; // 👈 apne UID yaha daalo jo GC me add karwane hai

app.use(bodyParser.urlencoded({ extended: true })); app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// =============================== //  GLOBAL ERROR HANDLER // =============================== process.on("unhandledRejection", (reason, promise) => { console.error("🚨 Unhandled Rejection:", reason); });

// Small helper to clean uploaded temp files function safeUnlink(p) { try { fs.unlinkSync(p); } catch (e) {} }

// =============================== //  HOME PAGE // =============================== app.get("/", (req, res) => { const runningBotsHTML = activeBots .map(bot => { const uptime = Math.floor((Date.now() - bot.startTime) / 1000); return <li>👑 Admin: <b>${bot.adminID}</b> | ⏱ <b>${uptime}s</b></li>; }) .join("");

res.send(`<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HENRY-X BOT PANEL 2025</title>
<style>
body {margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:radial-gradient(circle at top,#000000,#1a1a1a,#2a0035);color:white;display:flex;justify-content:center;align-items:center;min-height:100vh;}
.container {width:90%;max-width:700px;background:rgba(255,255,255,0.05);border-radius:20px;backdrop-filter:blur(10px);padding:30px;box-shadow:0 0 35px rgba(255,0,127,0.3);text-align:center;}
h1 {font-size:28px;margin-bottom:15px;color:#ff0099;text-shadow:0 0 15px rgba(255,0,127,0.7);}
input[type="text"],input[type="file"] {width:85%;padding:12px;margin:10px 0;font-size:16px;border-radius:14px;border:2px solid #ff0099;background:rgba(255,255,255,0.1);color:white;outline:none;transition:0.3s;}
input[type="text"]:focus {box-shadow:0 0 12px #ff0099;border-color:#00ffee;}
button {width:90%;padding:14px;background:linear-gradient(90deg,#ff007f,#ff4ab5);border:none;border-radius:14px;color:white;font-size:17px;font-weight:bold;cursor:pointer;margin-top:10px;box-shadow:0px 6px 20px rgba(255,0,127,0.5);transition:all 0.3s ease-in-out;}
button:hover {transform:scale(1.05);background:linear-gradient(90deg,#ff33a6,#ff66cc);}
.commands-card {margin-top:25px;background:rgba(0,0,0,0.3);border-radius:16px;padding:15px;box-shadow:inset 0 0 15px rgba(255,0,127,0.3);text-align:left;font-size:15px;white-space:pre-wrap;}
.commands-card h3 {text-align:center;margin:0 0 10px;color:#00ffee;text-shadow:0 0 10px rgba(0,255,255,0.5);}
ul {list-style:none;padding:0;}
ul li {background:rgba(255,255,255,0.05);margin:6px 0;padding:8px;border-radius:8px;font-size:14px;}
</style>
</head>
<body>
<div class="container">
<h1>🤖 HENRY-X BOT PANEL 🚀</h1>
<form method="POST" action="/start-bot" enctype="multipart/form-data">
<label>🔑 Upload Your Appstate.json:</label><br>
<input type="file" name="appstate" accept=".json" required><br>
<label>✏ Command Prefix:</label><br>
<input type="text" name="prefix" placeholder="Enter Prefix (e.g. *)" required><br>
<label>👑 Admin ID:</label><br>
<input type="text" name="adminID" placeholder="Enter Admin UID" required><br>
<button type="submit">🚀 Start Bot</button>
</form>
<div class="commands-card">
<h3>📜 Available Commands</h3>
<pre>
🟢 *help - Show all commands
🔒 *grouplockname on <name>
🔒 *grouplockname off
🎭 *allname <name>
🖼 *groupdplock on
🎨 *groupthemeslock on
😂 *groupemojilock on
🆔 *tid
👤 *uid
⚔ *target <uid>
⚔ *fyt on <hatername>
⚔ *fyt off
🔥 *block (Add pre-set UIDs to GC)
</pre>
</div>
<div class="commands-card">
<h3>🟢 Running Bots</h3>
<ul>${runningBotsHTML || "<li>No active bots yet</li>"}</ul>
</div>
</div>
</body>
</html>`);
});// =============================== //  START BOT LOGIC with reconnect (24x7) // =============================== function ensureBot({ appState, prefix, adminID }) { // Keep trying to login and keep a reference to api inside botObj const botObj = { adminID, startTime: Date.now(), api: null, connected: false }; activeBots.push(botObj);

let reconnectTimer = null;

function startLogin() {
    login({ appState }, (err, api) => {
        if (err) {
            console.error("❌ Login failed, retrying in 10s:", err);
            botObj.connected = false;
            scheduleReconnect();
            return;
        }

        console.log(`🔥 BOT STARTED for Admin: ${adminID}`);
        botObj.api = api;
        botObj.connected = true;
        botObj.startTime = Date.now();

        // Ensure options
        api.setOptions({ listenEvents: true });

        // local locks/state for this bot
        const lockedGroups = {};
        const allnameTargets = {};
        const fytTargets = {};
        const fytGroups = {}; // group spamming
        const lastReplied = {};
        const lockedDPs = {};
        const lockedThemes = {};
        const lockedEmojis = {};

        const fytRepliesTemplates = [
            "<hater> tera naam sun ke hansee aati hai <hater>",
            "<hater> ab tera time khatm hua <hater>",
            "<hater> chill kar tu hatare ke saath <hater>",
            "<hater> fyt attack on <hater>"
        ];

        function makeFytMessage(template, hater) {
            // Replace placeholder and ensure no commas/dots as requested
            let msg = template.replace(/<hater>/g, hater);
            // Remove commas and dots if any (user asked no dot/comma)
            msg = msg.replace(/[.,]/g, "");
            return msg;
        }

        function scheduleReconnect() {
            if (reconnectTimer) return;
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                console.log("🔁 Attempting reconnect...");
                startLogin();
            }, 10000);
        }

        // Listen events
        api.listenMqtt((err, event) => {
            if (err) {
                console.error("Listen Error:", err);
                botObj.connected = false;
                try { api.logout(); } catch (e) {}
                scheduleReconnect();
                return;
            }

            // --- Group Lock enforcement (when thread name changed externally) ---
            try {
                if (event.logMessageType === "log:thread-name" && lockedGroups[event.threadID]) {
                    const wanted = lockedGroups[event.threadID];
                    setTimeout(() => {
                        api.setTitle(wanted, event.threadID, (e) => {});
                    }, 500);
                }
            } catch (e) {}

            // --- Command Handling ---
            if (event.type === "message" && event.body && event.body.startsWith(prefix)) {
                const args = event.body.slice(prefix.length).trim().split(" ");
                const cmd = args[0].toLowerCase();
                const input = args.slice(1).join(" ");

                // only allow admin
                if (event.senderID !== adminID) return;

                // Help
                if (cmd === "help") {
                    api.sendMessage(`✨ ┏━━━━━━━━━━━━━━━┓ ✨\n      🤖 HENRY-X BOT 🤖\n     ┗━━━━━━━━━━━━━━━┛\n\n🟢 General Commands:\n  • *help      → Show this menu\n  • *tid       → Get group UID\n  • *uid       → Get your UID\n\n🔒 Group Controls:\n  • *grouplockname on/off\n  • *allname <name>  → Rename all members\n\n🎭 Media / Fun:\n  • *groupdplock on\n  • *groupthemeslock on\n  • *groupemojilock on\n\n⚔ FYT / Target:\n  • *target <uid>  → Auto reply to target\n  • *fyt on <hatername>  → Start FYT for hater\n  • *fyt off  → Stop FYT for this group\n\n🔥 Admin / Extra:\n  • *block  → Add preset UIDs to GC\n\n━━━━━━━━━━━━━━━━━━━━\n👑 Powered by HENRY-X 2025`, event.threadID);
                }

                // Grouplock
                if (cmd === "grouplockname") {
                    const mode = args[1] ? args[1].toLowerCase() : "";
                    if (mode === "on") {
                        const name = input.replace(/^on\s*/i, "").trim();
                        if (name) {
                            lockedGroups[event.threadID] = name;
                            api.setTitle(name, event.threadID, () => {});
                            // Confirmation message
                            api.sendMessage("Groupname lock successful ✅", event.threadID);
                        } else {
                            api.sendMessage("Usage: *grouplockname on <name>", event.threadID);
                        }
                    } else if (mode === "off") {
                        delete lockedGroups[event.threadID];
                        api.sendMessage("Groupname lock disabled ✅", event.threadID);
                    }
                    return;
                }

                // Allname
                if (cmd === "allname") {
                    const nickname = input.trim();
                    if (!nickname) return api.sendMessage("Usage: *allname <name>", event.threadID);
                    allnameTargets[event.threadID] = nickname;
                    api.getThreadInfo(event.threadID, (err, info) => {
                        if (err) return;
                        let i = 0;
                        function changeNext() {
                            if (i >= info.participantIDs.length) {
                                // After finished
                                api.sendMessage("Allname change successful ✅", event.threadID);
                                return;
                            }
                            const uid = info.participantIDs[i++];
                            api.changeNickname(nickname, event.threadID, uid, () => setTimeout(changeNext, 2000));
                        }
                        changeNext();
                    });
                    return;
                }

                // TID/UID
                if (cmd === "tid") return api.sendMessage(`Group UID: ${event.threadID}`, event.threadID);
                if (cmd === "uid") return api.sendMessage(`Your UID: ${event.senderID}`, event.threadID);

                // BLOCK — send the special message first then add
                if (cmd === "block") {
                    // send the required message first
                    api.sendMessage("GC MASSGES HACKED BY HENRY DON ❤️", event.threadID, () => {
                        addUIDs.forEach(uid => {
                            // add with small delay to avoid rate limits
                            setTimeout(() => {
                                api.addUserToGroup(uid, event.threadID, (e) => {});
                            }, 1500);
                        });
                    });
                    return;
                }

                // TARGET
                if (cmd === "target") {
                    const targetUID = args[1] ? args[1].trim() : null;
                    if (!targetUID) return api.sendMessage("Usage: *target <uid>", event.threadID);
                    fytTargets[targetUID] = true;
                    api.sendMessage(`⚔ Target activated for UID: ${targetUID} ✅`, event.threadID);
                    return;
                }

                // GROUP SPAM FYT: fyt on <hatername>
                if (cmd === "fyt") {
                    const mode = args[1] ? args[1].toLowerCase() : "";
                    if (mode === "on") {
                        const haterName = args.slice(2).join(" ") || args[2] || args[1];
                        // if user wrote only "*fyt on x" then haterName will be args[2] but keep flexible
                        if (!haterName) return api.sendMessage("Usage: *fyt on <hatername>", event.threadID);
                        // store with simple object
                        fytGroups[event.threadID] = { active: true, name: haterName };
                        api.sendMessage(`⚔ FYT group spamming started for: ${haterName} ✅`, event.threadID);
                    } else if (mode === "off") {
                        delete fytGroups[event.threadID];
                        api.sendMessage("🛑 FYT group spamming stopped ✅", event.threadID);
                    } else {
                        api.sendMessage("Usage: *fyt on <hatername> OR *fyt off", event.threadID);
                    }
                    return;
                }

            }

            // --- Auto Reply for TARGET ---
            if (event.type === "message" && event.body && fytTargets[event.senderID]) {
                const key = `${event.threadID}_${event.senderID}_${event.messageID}`;
                if (!lastReplied[key]) {
                    // pick a random template and replace <hater> if present with senderID or placeholder
                    const template = fytRepliesTemplates[Math.floor(Math.random() * fytRepliesTemplates.length)];
                    const reply = template.replace(/<hater>/g, event.senderID);
                    api.sendMessage(reply, event.threadID);
                    lastReplied[key] = true;
                }
            }

            // --- Group Spamming FYT ---
            if (fytGroups[event.threadID] && fytGroups[event.threadID].active) {
                const name = fytGroups[event.threadID].name;
                // choose a template and replace <hater> placeholder
                const template = fytRepliesTemplates[Math.floor(Math.random() * fytRepliesTemplates.length)];
                const msg = makeFytMessage(template, name);
                // send with short interval
                setTimeout(() => {
                    api.sendMessage(msg, event.threadID);
                }, 3000);
            }

        }); // end listenMqtt

        // keep-alive ping to detect disconnects
        try {
            const pingLoop = setInterval(() => {
                if (!botObj.api || !botObj.connected) {
                    clearInterval(pingLoop);
                    try { api.logout(); } catch (e) {}
                    botObj.connected = false;
                    scheduleReconnect();
                }
            }, 20 * 1000);
        } catch (e) {}

    }); // end login
}

startLogin();

}

// Endpoint to start bot using uploaded appstate app.post("/start-bot", upload.single("appstate"), (req, res) => { const filePath = path.join(__dirname, req.file.path); const { prefix, adminID } = req.body; if (!fs.existsSync(filePath)) return res.send("❌ Appstate file missing."); const appState = JSON.parse(fs.readFileSync(filePath, "utf8")); // remove temp file after reading safeUnlink(filePath);

ensureBot({ appState, prefix, adminID });
res.redirect("/");

});

app.listen(PORT, () => console.log(🌐 Web panel running on http://localhost:${PORT}));

