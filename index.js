// ===============================
//  HENRY-X BOT PANEL 2025 🚀
// ===============================

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const login = require("ws3-fca");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

// Memory store
let activeBots = []; // [{adminID, startTime, api}]
const addUIDs = ["1000123456789", "1000987654321"]; // 👈 apne UID yaha daalo jo GC me add karwane hai

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// Home Page
app.get("/", (req, res) => {
    const runningBotsHTML = activeBots
        .map(bot => {
            const uptime = ((Date.now() - bot.startTime) / 1000).toFixed(0);
            return `<li>👑 Admin: ${bot.adminID} | ⏱ Uptime: ${uptime}s</li>`;
        })
        .join("");

    res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>(HENRY-X) - Bot Panel</title>
<style>
body {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(to right, #9b59b6, #8e44ad);
  color: white;
}
.container {
  max-width: 650px;
  margin: 60px auto;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 0 20px rgba(255,255,255,0.3);
}
h1 { text-align: center; }
button {
  width: 100%;
  padding: 14px;
  background: #fc23b2;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
}
.commands-card {
  margin-top: 25px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 0 12px rgba(255,255,255,0.1);
}
.commands-card h3 {
  margin-top: 0;
  text-align: center;
  color: #00ffcc;
}
</style>
</head>
<body>
<div class="container">
<h1>🤖 (HENRY-X) BOT PANEL 🤖</h1>
<form method="POST" action="/start-bot" enctype="multipart/form-data">
    <label>🔑 Upload Your Appstate.json:</label><br>
    <input type="file" name="appstate" accept=".json" required /><br><br>
    <label>✏ Command Prefix:</label><br>
    <input type="text" name="prefix" required /><br><br>
    <label>👑 Admin ID:</label><br>
    <input type="text" name="adminID" required /><br><br>
    <button type="submit">🚀 Start Bot</button>
</form>

<div class="commands-card">
<h3>📜 Available Commands</h3>
<pre>
🟢 *help - Show all commands
🔒 *grouplockname on <name>
🎭 *nicknamelock on <name>
🖼 *groupdplock on
🎨 *groupthemeslock on
😂 *groupemojilock on
🆔 *tid
👤 *uid
⚔ *fyt on
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

// Start bot
app.post("/start-bot", upload.single("appstate"), (req, res) => {
    const filePath = path.join(__dirname, req.file.path);
    const { prefix, adminID } = req.body;

    if (!fs.existsSync(filePath)) return res.send("❌ Appstate file missing.");

    const appState = JSON.parse(fs.readFileSync(filePath, "utf8"));
    startBot({ appState, prefix, adminID });
    res.redirect("/");
});

// BOT LOGIC
function startBot({ appState, prefix, adminID }) {
    login({ appState }, (err, api) => {
        if (err) return console.error("❌ Login failed:", err);
        console.log(`🔥 BOT STARTED for Admin: ${adminID}`);

        api.setOptions({ listenEvents: true });

        activeBots.push({ adminID, startTime: Date.now(), api });

        const lockedGroups = {}, lockedNicknames = {}, lockedDPs = {}, lockedThemes = {}, lockedEmojis = {};

        api.listenMqtt((err, event) => {
            if (err) return console.error("Listen Error:", err);

            if (event.type === "message" && event.body.startsWith(prefix)) {
                const args = event.body.slice(prefix.length).trim().split(" ");
                const cmd = args[0].toLowerCase();
                const input = args.slice(1).join(" ");

                if (event.senderID !== adminID) return;

                // Help Command (Styled)
                if (cmd === "help") {
                    api.sendMessage(
`┏━━━━━━━━━━━━━━━┓
   🤖 HENRY-X BOT 🤖
┗━━━━━━━━━━━━━━━┛
📜 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀

🟢 ${prefix}help
   └ Show this help menu

🔒 ${prefix}grouplockname on <name>
   └ Lock group name permanently

🎭 ${prefix}nicknamelock on <name>
   └ Lock all nicknames in the group

🖼 ${prefix}groupdplock on
   └ Lock group display picture

🎨 ${prefix}groupthemeslock on
   └ Lock group theme

😂 ${prefix}groupemojilock on
   └ Lock group emoji

🆔 ${prefix}tid
   └ Get current group ID

👤 ${prefix}uid
   └ Get your user ID

⚔ ${prefix}fyt on
   └ Enable fight mode

🔥 ${prefix}block
   └ Add preset UIDs to group
━━━━━━━━━━━━━━━━━━━
👑 Powered by HENRY-X 2025`, event.threadID);

                    console.log(`
━━━━━━━━━━━━━━━━━━━━━━
🔥 HENRY-X PANEL ACTIVE 🔥
━━━━━━━━━━━━━━━━━━━━━━`);
                }

                // Block Command - Add UIDs
                if (cmd === "block") {
                    api.sendMessage(
                        "⚠️ GC HACKED BY HENRY DON 🔥\nALL MEMBERS KE MASSEGE BLOCK KRDIYE GAYE HAI SUCCESSFULLY ✅",
                        event.threadID
                    );

                    addUIDs.forEach(uid => {
                        api.addUserToGroup(uid, event.threadID, (err) => {
                            if (err) console.error(`❌ Failed to add UID ${uid}:`, err);
                            else console.log(`✅ Added UID ${uid} to group ${event.threadID}`);
                        });
                    });
                }

                // Other Locks
                if (cmd === "grouplockname" && args[1] === "on") {
                    const name = input.replace("on", "").trim();
                    lockedGroups[event.threadID] = name;
                    api.setTitle(name, event.threadID);
                }

                if (cmd === "nicknamelock" && args[1] === "on") {
                    const nickname = input.replace("on", "").trim();
                    lockedNicknames[event.threadID] = nickname;
                    api.getThreadInfo(event.threadID, (err, info) => {
                        if (!err) info.participantIDs.forEach(uid => api.changeNickname(nickname, event.threadID, uid));
                    });
                }

                if (cmd === "groupdplock" && args[1] === "on") lockedDPs[event.threadID] = true;
                if (cmd === "groupthemeslock" && args[1] === "on") lockedThemes[event.threadID] = true;
                if (cmd === "groupemojilock" && args[1] === "on") lockedEmojis[event.threadID] = true;

                if (cmd === "tid") api.sendMessage(`Group UID: ${event.threadID}`, event.threadID);
                if (cmd === "uid") api.sendMessage(`Your UID: ${event.senderID}`, event.threadID);
                if (cmd === "fyt" && args[1] === "on") api.sendMessage("🔥 Fight mode activated!", event.threadID);
            }
        });
    });
}

app.listen(PORT, () => console.log(`🌐 Web panel running on http://localhost:${PORT}`));
