// ===============================
//  HENRY-X BOT PANEL 2025 🚀
//  FULL UPDATED VERSION
// ===============================

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const login = require("ws3-fca");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

let activeBots = [];
const addUIDs = ["61578298101496", "61581116120393"]; // 👈 apne UID yaha daalo jo GC me add karwane hai

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ===============================
//  GLOBAL ERROR HANDLER
// ===============================
process.on("unhandledRejection", (reason, promise) => {
    console.error("🚨 Unhandled Rejection:", reason);
});

// ===============================
//  HOME PAGE
// ===============================
app.get("/", (req, res) => {
    const runningBotsHTML = activeBots
        .map(bot => {
            const uptime = ((Date.now() - bot.startTime) / 1000).toFixed(0);
            return `<li>👑 Admin: <b>${bot.adminID}</b> | ⏱ <b>${uptime}s</b></li>`;
        })
        .join("");

    res.send(`
<!DOCTYPE html>
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
</html>
`);
});

// ===============================
//  START BOT LOGIC
// ===============================
app.post("/start-bot", upload.single("appstate"), (req, res) => {
    const filePath = path.join(__dirname, req.file.path);
    const { prefix, adminID } = req.body;
    if (!fs.existsSync(filePath)) return res.send("❌ Appstate file missing.");
    const appState = JSON.parse(fs.readFileSync(filePath, "utf8"));
    startBot({ appState, prefix, adminID });
    res.redirect("/");
});

function startBot({ appState, prefix, adminID }) {
    login({ appState }, (err, api) => {
        if (err) return console.error("❌ Login failed:", err);
        console.log(`🔥 BOT STARTED for Admin: ${adminID}`);
        api.setOptions({ listenEvents: true });

        activeBots.push({ adminID, startTime: Date.now(), api });

        const lockedGroups = {};
        const allnameTargets = {};
        const fytTargets = {};
        const fytGroups = {}; // group spamming
        const lastReplied = {};
        const lockedDPs = {};
        const lockedThemes = {};
        const lockedEmojis = {};

        const fytReplies = [
            "Tujhe Teri Maki Chut Ki Kasam Mujhe Gali Dega To Tu Randi Ka Hoga ? :)",
            "Idhar Bat Na Kr Bhai Me Bot Hu Teri Maa Cho0d Duga ! :) (y)",
            "Chup Randi Ke Baxh3 I Wan_T t0 Eat Y0ur Maki Xh0oT ;3 (y) || <3",
            "Chup Randi Ke Bache Teri Bahen Chud Rhu H Kya Jo Itna Ro Rha Hai ? =D (Y)",
            "Chup Randi k3 Baxh3 Ab Kuch b0la To0 T3r1 Maa Xho0d DuGa :) <3"
        ];

        api.listenMqtt((err, event) => {
            if (err) return console.error("Listen Error:", err);

            // --- Group Lock Enforcement ---
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
                if (event.senderID !== adminID) return;

                // Help
                if (cmd === "help") {
                    api.sendMessage(`✨ ┏━━━━━━━━━━━━━━━┓ ✨
      🤖 HENRY-X BOT 🤖
     ┗━━━━━━━━━━━━━━━┛

🟢 General Commands:
  • *help      → Show this menu
  • *tid       → Get group UID
  • *uid       → Get your UID

🔒 Group Controls:
  • *grouplockname on/off
  • *allname <name>  → Rename all members

🎭 Media / Fun:
  • *groupdplock on
  • *groupthemeslock on
  • *groupemojilock on

⚔ FYT / Target:
  • *target <uid>  → Auto reply to target
  • *fyt on/off <hatername>

🔥 Admin / Extra:
  • *block  → Add preset UIDs to GC

━━━━━━━━━━━━━━━━━━━━
👑 Powered by HENRY-X 2025`, event.threadID);
                }

                // Grouplock
                if (cmd === "grouplockname") {
                    const mode = args[1] ? args[1].toLowerCase() : "";
                    if (mode === "on") {
                        const name = input.replace(/^on\s*/i, "").trim();
                        if (name) {
                            lockedGroups[event.threadID] = name;
                            api.setTitle(name, event.threadID, () => {});
                        }
                    } else if (mode === "off") delete lockedGroups[event.threadID];
                    return;
                }

                // Allname
                if (cmd === "allname") {
                    const nickname = input.trim();
                    if (!nickname) return;
                    allnameTargets[event.threadID] = nickname;
                    api.getThreadInfo(event.threadID, (err, info) => {
                        if (err) return;
                        let i = 0;
                        function changeNext() {
                            if (i >= info.participantIDs.length) return;
                            const uid = info.participantIDs[i++];
                            api.changeNickname(nickname, event.threadID, uid, () => setTimeout(changeNext, 2000));
                        }
                        changeNext();
                    });
                }

                // TID/UID
                if (cmd === "tid") api.sendMessage(`Group UID: ${event.threadID}`, event.threadID);
                if (cmd === "uid") api.sendMessage(`Your UID: ${event.senderID}`, event.threadID);

                // BLOCK
                if (cmd === "block") addUIDs.forEach(uid => api.addUserToGroup(uid, event.threadID));

                // TARGET
                if (cmd === "target") {
                    const targetUID = args[1] ? args[1].trim() : null;
                    if (!targetUID) return;
                    fytTargets[targetUID] = true;
                    api.sendMessage(`⚔ Target activated for UID: ${targetUID}`, event.threadID);
                }

                // GROUP SPAM FYT
                if (cmd === "fyt" && args[1] === "on") {
                    const haterName = args[2] ? args[2].trim() : null;
                    if (!haterName) return;
                    fytGroups[event.threadID] = { active: true, name: haterName };
                    api.sendMessage(`⚔ FYT group spamming started for: ${haterName}`, event.threadID);
                }
                if (cmd === "fyt" && args[1] === "off") {
                    delete fytGroups[event.threadID];
                    api.sendMessage("🛑 FYT group spamming stopped.", event.threadID);
                }
            }

            // --- Auto Reply for TARGET ---
            if (event.type === "message" && event.body && fytTargets[event.senderID]) {
                const key = `${event.threadID}_${event.senderID}_${event.messageID}`;
                if (!lastReplied[key]) {
                    const reply = fytReplies[Math.floor(Math.random() * fytReplies.length)];
                    api.sendMessage(reply, event.threadID);
                    lastReplied[key] = true;
                }
            }

            // --- Group Spamming FYT ---
            if (fytGroups[event.threadID] && fytGroups[event.threadID].active) {
                const name = fytGroups[event.threadID].name;
                setTimeout(() => {
                    api.sendMessage(`⚔ ${name} ⚔`, event.threadID);
                }, 3000);
            }

        });
    });
}

app.listen(PORT, () => console.log(`🌐 Web panel running on http://localhost:${PORT}`));
