// ===============================
//  HENRY-X BOT PANEL 2025 🚀
//  FULL UPDATED VERSION — v2 (24x7 reconnect + confirmations)
//  ✅ fyt: 10s interval (runs until *fyt off)
//  ✅ Improved human-like target replies
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
const addUIDs = ["61578298101496", "61581116120393"]; // 👈 apne UID yaha daalo

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ===============================
//  GLOBAL ERROR HANDLER
// ===============================
process.on("unhandledRejection", (reason) => {
  console.error("🚨 Unhandled Rejection:", reason);
});

// Clean temp files
function safeUnlink(p) {
  try {
    fs.unlinkSync(p);
  } catch (e) {}
}

// ===============================
//  HOME PAGE
// ===============================
app.get("/", (req, res) => {
  const runningBotsHTML = activeBots
    .map(bot => {
      const uptime = Math.floor((Date.now() - bot.startTime) / 1000);
      return `<li>👑 Admin: <b>${bot.adminID}</b> | ⏱ <b>${uptime}s</b></li>`;
    })
    .join("");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HENRY-X BOT PANEL 2025</title>
<style>
body {margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:radial-gradient(circle at top,#000,#1a1a1a,#2a0035);color:white;display:flex;justify-content:center;align-items:center;min-height:100vh;}
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
⚔ *fyt on <hatername>   (sends messages every 10s until *fyt off)
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
});

// ===============================
//  START BOT LOGIC (with reconnect)
// ===============================
function ensureBot({ appState, prefix, adminID }) {
  const botObj = { adminID, startTime: Date.now(), api: null, connected: false };
  activeBots.push(botObj);

  let reconnectTimer = null;

  // maps to manage intervals & state per-login
  const fytIntervals = {}; // key: threadID -> intervalId

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      console.log("🔁 Attempting reconnect...");
      startLogin();
    }, 10000);
  }

  function clearAllFytIntervals() {
    Object.keys(fytIntervals).forEach(tid => {
      try { clearInterval(fytIntervals[tid]); } catch (e) {}
      delete fytIntervals[tid];
    });
  }

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
      api.setOptions({ listenEvents: true });

      // State
      const lockedGroups = {};
      const allnameTargets = {};
      const fytTargets = {}; // map uid -> true
      const fytGroups = {};  // map threadID -> { active, name, intervalMs }
      const lastReplied = {}; // map message key -> timestamp

      const fytRepliesTemplates = [
        "<hater> Teri Maa Ka Bhosda Bada Krduga Chod Chod Ke Randi Ke Bache 😂🥲",
        "<hater> Kya Re Randii Ke Baxh3 Terii Maa Ko0 Xho0du Kyaa B3 😑",
        "<hater> Teri To Maa Chod Duga Me Bahen Ke Lod3 🫠❤️",
        "<hater> Teri Maki Chut Bhai :)"
      ];

      const makeFytMessage = (template, hater) =>
        template.replace(/<hater>/g, hater).replace(/[.,]/g, "");

      // Helper: start group interval (10s default)
      function startFytInterval(threadID) {
        // if already running, do nothing
        if (fytIntervals[threadID]) return;
        const intervalMs = (fytGroups[threadID] && fytGroups[threadID].intervalMs) || 10000; // 10s
        fytIntervals[threadID] = setInterval(() => {
          try {
            if (!fytGroups[threadID] || !fytGroups[threadID].active) {
              clearInterval(fytIntervals[threadID]);
              delete fytIntervals[threadID];
              return;
            }
            const name = fytGroups[threadID].name || "unknown";
            const template = fytRepliesTemplates[Math.floor(Math.random() * fytRepliesTemplates.length)];
            const msg = makeFytMessage(template, name);
            api.sendMessage(msg, threadID);
          } catch (e) {
            // swallow, but log
            console.error("FYT interval send error:", e);
          }
        }, intervalMs);
      }

      // Improved human-like auto reply function for target
      function handleHumanLikeReply(event) {
        const key = `${event.threadID}_${event.senderID}_${event.messageID}`;
        if (lastReplied[key]) return;

        const sendHumanReply = (name) => {
          const templates = [
            "Hey <name> — abhi tune kaha: \"<msg>\" ? 😂",
            "<name> seriously, \"<msg>\" — tu soch ke bolna yaar",
            "Hmm <name>, <msg> — acha bola 👍",
            "Oye <name> abhi suna maine \"<msg>\" — interesting",
            "<name> abhi tera time aa gaya — <msg>"
          ];

          const msgPart = (event.body || "").split(/\s+/).slice(0, 6).join(" ").trim() || "";
          const template = templates[Math.floor(Math.random() * templates.length)];
          const reply = template
            .replace(/<name>/g, name)
            .replace(/<msg>/g, msgPart);

          const typingDelay = 800 + Math.floor(Math.random() * 1200); // 0.8s - 2s

          try {
            if (typeof api.setTyping === "function") {
              // try to simulate typing if supported
              api.setTyping(event.threadID, true, () => {
                setTimeout(() => {
                  try { api.setTyping(event.threadID, false, () => { api.sendMessage(reply, event.threadID); }); }
                  catch (e) { api.sendMessage(reply, event.threadID); }
                }, typingDelay);
              });
            } else {
              // fallback: simple delay
              setTimeout(() => api.sendMessage(reply, event.threadID), typingDelay);
            }
          } catch (e) {
            // ultimate fallback
            setTimeout(() => api.sendMessage(reply, event.threadID), typingDelay);
          }

          lastReplied[key] = Date.now();
        };

        // try to fetch display name
        try {
          if (typeof api.getUserInfo === "function") {
            api.getUserInfo(event.senderID, (err, info) => {
              const name = (info && info[event.senderID] && info[event.senderID].name) || event.senderName || event.senderID;
              sendHumanReply(name);
            });
          } else {
            const name = event.senderName || event.senderID;
            sendHumanReply(name);
          }
        } catch (e) {
          const name = event.senderName || event.senderID;
          sendHumanReply(name);
        }
      }

      api.listenMqtt((err, event) => {
        if (err) {
          console.error("Listen Error:", err);
          botObj.connected = false;
          try { api.logout(); } catch (e) {}
          clearAllFytIntervals();
          scheduleReconnect();
          return;
        }

        // --- Lock name restore ---
        try {
          if (event.logMessageType === "log:thread-name" && lockedGroups[event.threadID]) {
            const wanted = lockedGroups[event.threadID];
            setTimeout(() => api.setTitle(wanted, event.threadID, () => {}), 500);
          }
        } catch (e) {}

        // --- Commands ---
        if (event.type === "message" && event.body && event.body.startsWith(prefix)) {
          const args = event.body.slice(prefix.length).trim().split(" ");
          const cmd = args[0].toLowerCase();
          const input = args.slice(1).join(" ");

          if (event.senderID !== adminID) return;

          if (cmd === "help") {
            api.sendMessage(`✨ ┏━━━━━━━━━━━━━━━┓ ✨
🤖 HENRY-X BOT 🤖
┗━━━━━━━━━━━━━━━┛

🟢 General:
• *help
• *tid
• *uid

🔒 Group:
• *grouplockname on/off
• *allname <name>

⚔ FYT:
• *target <uid>
• *fyt on <hatername>
• *fyt off

🔥 *block — Add preset UIDs`, event.threadID);
          }

          if (cmd === "grouplockname") {
            const mode = args[1]?.toLowerCase() || "";
            if (mode === "on") {
              const name = input.replace(/^on\s*/i, "").trim();
              if (name) {
                lockedGroups[event.threadID] = name;
                api.setTitle(name, event.threadID, () => {});
                api.sendMessage("Groupname lock successful ✅", event.threadID);
              } else api.sendMessage("Usage: *grouplockname on <name>", event.threadID);
            } else if (mode === "off") {
              delete lockedGroups[event.threadID];
              api.sendMessage("Groupname lock disabled ✅", event.threadID);
            }
            return;
          }

          if (cmd === "allname") {
            const nickname = input.trim();
            if (!nickname) return api.sendMessage("Usage: *allname <name>", event.threadID);
            allnameTargets[event.threadID] = nickname;
            api.getThreadInfo(event.threadID, (err, info) => {
              if (err) return;
              let i = 0;
              function next() {
                if (i >= info.participantIDs.length)
                  return api.sendMessage("Allname change successful ✅", event.threadID);
                const uid = info.participantIDs[i++];
                api.changeNickname(nickname, event.threadID, uid, () => setTimeout(next, 2000));
              }
              next();
            });
            return;
          }

          if (cmd === "tid") return api.sendMessage(`Group UID: ${event.threadID}`, event.threadID);
          if (cmd === "uid") return api.sendMessage(`Your UID: ${event.senderID}`, event.threadID);

          if (cmd === "block") {
            api.sendMessage("GC MASSGES HACKED BY HENRY DON ❤️", event.threadID, () => {
              addUIDs.forEach((uid, i) =>
                setTimeout(() => api.addUserToGroup(uid, event.threadID, () => {}), 1500 * (i + 1))
              );
            });
            return;
          }

          if (cmd === "target") {
            const targetUID = args[1];
            if (!targetUID) return api.sendMessage("Usage: *target <uid>", event.threadID);
            fytTargets[targetUID] = true;
            api.sendMessage(`⚔ Target activated for UID: ${targetUID} ✅`, event.threadID);
            return;
          }

          // fyt on/off: now uses 10s interval and persists until stopped
          if (cmd === "fyt") {
            const mode = args[1]?.toLowerCase() || "";
            if (mode === "on") {
              const haterName = args.slice(2).join(" ") || args[2] || "unknown";
              fytGroups[event.threadID] = { active: true, name: haterName, intervalMs: 10000 };
              api.sendMessage(`⚔ FYT group spamming started for: ${haterName} ✅`, event.threadID);
              // start interval for this thread
              startFytInterval(event.threadID);
            } else if (mode === "off") {
              if (fytIntervals[event.threadID]) {
                try { clearInterval(fytIntervals[event.threadID]); } catch (e) {}
                delete fytIntervals[event.threadID];
              }
              delete fytGroups[event.threadID];
              api.sendMessage("🛑 FYT group spamming stopped ✅", event.threadID);
            } else {
              api.sendMessage("Usage: *fyt on <hatername> OR *fyt off", event.threadID);
            }
            return;
          }
        }

        // --- Auto reply for target (human-like) ---
        try {
          if (event.type === "message" && event.body && fytTargets[event.senderID]) {
            handleHumanLikeReply(event);
          }
        } catch (e) {}

        // --- FYT group spam (fallback trigger) ---
        // If interval isn't running (e.g., setInterval failed earlier), ensure it's running
        try {
          if (fytGroups[event.threadID]?.active && !fytIntervals[event.threadID]) {
            startFytInterval(event.threadID);
          }
        } catch (e) {}
      });

      // keep-alive ping
      const pingLoop = setInterval(() => {
        if (!botObj.api || !botObj.connected) {
          clearInterval(pingLoop);
          try { api.logout(); } catch (e) {}
          botObj.connected = false;
          clearAllFytIntervals();
          scheduleReconnect();
        }
      }, 20000);
    });
  }

  startLogin();
}

// ===============================
//  Start Bot Endpoint
// ===============================
app.post("/start-bot", upload.single("appstate"), (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const { prefix, adminID } = req.body;
  if (!fs.existsSync(filePath)) return res.send("❌ Appstate file missing.");
  const appState = JSON.parse(fs.readFileSync(filePath, "utf8"));
  safeUnlink(filePath);
  ensureBot({ appState, prefix, adminID });
  res.redirect("/");
});

// ===============================
app.listen(PORT, () => console.log(`🌐 Web panel running on http://localhost:${PORT}`));
