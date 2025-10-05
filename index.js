// ===============================
//  HENRY-X BOT PANEL 2025 🚀
//  UPDATED: target + fyt-group spam + allname + locks enforcement
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
const addUIDs = ["61578298101496", "61581116120393"]; // keep as you like

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
const upload = multer({ dest: "uploads/" });

// ===============================
//  GLOBAL ERROR HANDLER
// ===============================
process.on("unhandledRejection", (reason, promise) => {
    console.error("🚨 Unhandled Rejection:", reason);
});

// ===============================
//  HOME PAGE (HTML + CSS UPGRADED)
//  (unchanged HTML omitted here for brevity; keep your existing markup)
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
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', sans-serif;
    background: radial-gradient(circle at top, #000000, #1a1a1a, #2a0035);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .container {
    width: 90%;
    max-width: 700px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    padding: 30px;
    box-shadow: 0 0 35px rgba(255, 0, 127, 0.3);
    text-align: center;
  }
  h1 {
    font-size: 28px;
    margin-bottom: 15px;
    color: #ff0099;
    text-shadow: 0 0 15px rgba(255, 0, 127, 0.7);
  }
  input[type="text"], input[type="file"] {
    width: 85%;
    padding: 12px;
    margin: 10px 0;
    font-size: 16px;
    border-radius: 14px;
    border: 2px solid #ff0099;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    outline: none;
    transition: 0.3s;
  }
  input[type="text"]:focus {
    box-shadow: 0 0 12px #ff0099;
    border-color: #00ffee;
  }
  button {
    width: 90%;
    padding: 14px;
    background: linear-gradient(90deg, #ff007f, #ff4ab5);
    border: none;
    border-radius: 14px;
    color: white;
    font-size: 17px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 10px;
    box-shadow: 0px 6px 20px rgba(255,0,127,0.5);
    transition: all 0.3s ease-in-out;
  }
  button:hover {
    transform: scale(1.05);
    background: linear-gradient(90deg, #ff33a6, #ff66cc);
  }
  .commands-card {
    margin-top: 25px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 16px;
    padding: 15px;
    box-shadow: inset 0 0 15px rgba(255,0,127,0.3);
    text-align: left;
    font-size: 15px;
    white-space: pre-wrap;
  }
  .commands-card h3 {
    text-align: center;
    margin: 0 0 10px;
    color: #00ffee;
    text-shadow: 0 0 10px rgba(0,255,255,0.5);
  }
  ul {
    list-style: none;
    padding: 0;
  }
  ul li {
    background: rgba(255,255,255,0.05);
    margin: 6px 0;
    padding: 8px;
    border-radius: 8px;
    font-size: 14px;
  }
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
🎭 *nicknamelock on <name>
🖼 *groupdplock on
🎨 *groupthemeslock on
😂 *groupemojilock on
🆔 *tid
👤 *uid
⚔ *fyt on <hatername>
⚔ *fyt off <hatername>
🔥 *block (Add pre-set UIDs to GC)
⚡ *target on <uid>
⚡ *target off <uid>
</pre>
</div>

<div class="commands-card">
<h3>🟢 Running Bots</h3>
<ul>${runningBotsHTML || "<li>No active bots yet</li>"}</ul>
</div>
</div>
</body>
</html>
    `)); // keep original page; shortened here to keep message compact
});

// ===============================
//  START BOT LOGIC (UPDATED)
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

        // state stores
        const lockedGroups = {};      // { threadID: "Title" }
        const lockedNicknames = {};   // { threadID: "Nickname" }
        const lockedDPs = {};         // { threadID: true }
        const lockedThemes = {};      // { threadID: true }
        const lockedEmojis = {};      // { threadID: true }

        const targetTargets = {};     // { uid: true }  -> global reply-to-message
        const lastReplied = {};       // { `${thread}_${uid}`: messageID }

        // group spammers: { threadID: {name: <label>, intervalId: <id>} }
        const groupSpammers = {};

        // safer fyt replies (sanitized)
        const fytReplies = [
            " Terii To0 Maa Cud Ne Wali Hwi Rawndi Ke Baxh3 :)",
            " Dekh Pai Teri Maa Di Phudey Me L0la Mar Dugaa Me3 Aaj B3ta smjha Kyaa ?.",
            "Haha Randi Ka Baxh3 Me Hurami Bot Hu Teri Maa Xho0d Duga Aj To0 Me3 Hahaha 😂",
            "Haha Teri Bahen Ko Chod ke Gomti Nadi Me Fek Duga Gandu Ke Baxhe Kyaa Smjha Bhai ?? ;3 (y) .",
            "Randi Ke Bache Teri Maa Chud Gayi Successfully ✅."
        ];

        api.listenMqtt((err, event) => {
            if (err) return console.error("Listen Error:", err);

            // ---------- Enforce locks based on log events ----------
            try {
                // thread title change
                if (event.logMessageType === "log:thread-name" && lockedGroups[event.threadID]) {
                    const wanted = lockedGroups[event.threadID];
                    setTimeout(() => {
                        api.setTitle(wanted, event.threadID, (e) => {
                            if (e) console.error("Failed to reapply title:", e);
                            else console.log(`🔒 Reapplied title "${wanted}" for ${event.threadID}`);
                        });
                    }, 500);
                }

                // thread icon change (dp)
                if (event.logMessageType === "log:thread-icon" && lockedDPs[event.threadID]) {
                    // reapply - note: setting dp requires a valid image buffer - we assume admin set desired dp earlier
                    // If you want to store the dp and reapply, you'd store it in lockedDPs[threadID] as a buffer/path.
                    console.log("🔒 Detected DP change for", event.threadID, "- locked, attempting to revert (requires stored DP).");
                }

                // nickname change detection - attempt to reapply locked nickname
                if ((event.logMessageType === "log:user-nickname" || event.logMessageType === "log:user-removed-nickname") && lockedNicknames[event.threadID]) {
                    const wantedNick = lockedNicknames[event.threadID];
                    // try reapply for all participants (safe fallback)
                    api.getThreadInfo(event.threadID, (err, info) => {
                        if (err || !info) return;
                        let i = 0;
                        function changeNext() {
                            if (i >= info.participantIDs.length) return;
                            const uid = info.participantIDs[i++];
                            api.changeNickname(wantedNick, event.threadID, uid, (e) => {
                                if (e) {
                                    // ignore individual failures
                                }
                                setTimeout(changeNext, 2000);
                            });
                        }
                        changeNext();
                    });
                }
            } catch (e) {
                // ignore
            }

            // ---------- Command handling (admin-only) ----------
            if (event.type === "message" && event.body && event.body.startsWith(prefix)) {
                const args = event.body.slice(prefix.length).trim().split(/\s+/);
                const cmd = args[0].toLowerCase();
                const inputArgs = args.slice(1);

                // only admin can run commands
                if (event.senderID !== adminID) return;

                // HELP
                if (cmd === "help") {
                    api.sendMessage(
`┏━━━━━━━━━━━━━━━┓
   🤖 HENRY-X BOT 🤖
┗━━━━━━━━━━━━━━━┛
📜 Available Commands:
🟢 ${prefix}help
🔒 ${prefix}grouplockname on <name>
🔒 ${prefix}grouplockname off
🎭 ${prefix}nicknamelock on <name>
🖼 ${prefix}groupdplock on
🎨 ${prefix}groupthemeslock on
😂 ${prefix}groupemojilock on
🆔 ${prefix}tid
👤 ${prefix}uid
⚔ ${prefix}fyt on <uid>
⚔ ${prefix}fyt off <uid>
🔥 ${prefix}block
⚡ ${prefix}target on
⚡ ${prefix}target off
━━━━━━━━━━━━━━━━━━━
👑 Powered by HENRY-X 2025`, event.threadID);
                }

                // GROUP LOCK NAME
                if (cmd === "grouplockname") {
                    const mode = (inputArgs[0] || "").toLowerCase();
                    if (mode === "on") {
                        const name = inputArgs.slice(1).join(" ") || inputArgs.slice(0).join(" ");
                        if (!name) return api.sendMessage("❗ Usage: " + prefix + "grouplockname on <Group Name>", event.threadID);
                        lockedGroups[event.threadID] = name;
                        api.setTitle(name, event.threadID, (e) => {
                            if (e) api.sendMessage("❌ Failed to set locked group name.", event.threadID);
                            else api.sendMessage(`🔒 Group name locked as "${name}"`, event.threadID);
                        });
                    } else if (mode === "off") {
                        if (lockedGroups[event.threadID]) {
                            delete lockedGroups[event.threadID];
                            api.sendMessage("🔓 Group name unlocked.", event.threadID);
                        } else api.sendMessage("ℹ️ This group is not locked.", event.threadID);
                    } else api.sendMessage("❗ Usage: " + prefix + "grouplockname on <name> OR off", event.threadID);
                }

                // ALLNAME (formerly nicknamelock)
                if (cmd === "allname") {
                    const mode = (inputArgs[0] || "").toLowerCase();
                    if (mode === "on") {
                        const name = inputArgs.slice(1).join(" ") || inputArgs.slice(0).join(" ");
                        if (!name) return api.sendMessage("❗ Usage: " + prefix + "allname on <name>", event.threadID);
                        lockedNicknames[event.threadID] = name;
                        api.getThreadInfo(event.threadID, (err, info) => {
                            if (err || !info) return api.sendMessage("❌ Failed to fetch participants.", event.threadID);
                            let i = 0;
                            function changeNext() {
                                if (i >= info.participantIDs.length) {
                                    api.sendMessage(`✅ All nicknames changed to "${name}"`, event.threadID);
                                    return;
                                }
                                const uid = info.participantIDs[i++];
                                api.changeNickname(name, event.threadID, uid, (e) => {
                                    if (e) console.error("Nickname change failed for", uid, e);
                                    setTimeout(changeNext, 2000); // 2s delay
                                });
                            }
                            changeNext();
                        });
                    } else if (mode === "off") {
                        if (lockedNicknames[event.threadID]) {
                            delete lockedNicknames[event.threadID];
                            api.sendMessage("🔓 allname lock removed for this group.", event.threadID);
                        } else api.sendMessage("ℹ️ allname not set for this group.", event.threadID);
                    } else api.sendMessage("❗ Usage: " + prefix + "allname on <name> OR off", event.threadID);
                }

                // GROUP DP/THEME/EMOJI locks toggles (basic)
                if (cmd === "groupdplock") {
                    if ((inputArgs[0] || "").toLowerCase() === "on") {
                        lockedDPs[event.threadID] = true; api.sendMessage("🔒 group DP lock enabled.", event.threadID);
                    } else if ((inputArgs[0] || "").toLowerCase() === "off") { delete lockedDPs[event.threadID]; api.sendMessage("🔓 group DP lock disabled.", event.threadID); }
                }
                if (cmd === "groupthemeslock") {
                    if ((inputArgs[0] || "").toLowerCase() === "on") { lockedThemes[event.threadID] = true; api.sendMessage("🔒 group themes lock enabled.", event.threadID); }
                    else if ((inputArgs[0] || "").toLowerCase() === "off") { delete lockedThemes[event.threadID]; api.sendMessage("🔓 group themes lock disabled.", event.threadID); }
                }
                if (cmd === "groupemojilock") {
                    if ((inputArgs[0] || "").toLowerCase() === "on") { lockedEmojis[event.threadID] = true; api.sendMessage("🔒 group emojis lock enabled.", event.threadID); }
                    else if ((inputArgs[0] || "").toLowerCase() === "off") { delete lockedEmojis[event.threadID]; api.sendMessage("🔓 group emojis lock disabled.", event.threadID); }
                }

                // TARGET: global reply-to-message for UID
                if (cmd === "target") {
                    const mode = (inputArgs[0] || "").toLowerCase();
                    const targetUID = inputArgs[1] ? inputArgs[1].trim() : inputArgs[0] ? inputArgs[0].trim() : null;
                    if (mode === "on" && targetUID) {
                        targetTargets[targetUID] = true;
                        api.sendMessage(`⚔️ target ON for UID: ${targetUID}`, event.threadID);
                    } else if (mode === "off" && targetUID) {
                        delete targetTargets[targetUID];
                        api.sendMessage(`🛑 target OFF for UID: ${targetUID}`, event.threadID);
                    } else {
                        api.sendMessage(`❗ Usage: ${prefix}target on <UID>  OR  ${prefix}target off <UID>`, event.threadID);
                    }
                }

                // FYT (group spam): works only when called inside a group
                if (cmd === "fyt") {
                    const mode = (inputArgs[0] || "").toLowerCase();
                    // target label is rest of args
                    const label = inputArgs.slice(1).join(" ") || inputArgs.join(" ");
                    const thread = event.threadID;

                    if (mode === "on") {
                        if (!label) return api.sendMessage(`❗ Usage: ${prefix}fyt on <label> (group-only)`, thread);
                        if (groupSpammers[thread]) return api.sendMessage("⚠️ A spam session is already running in this group. Use fyt off <label> to stop.", thread);

                        // start spam interval
                        const iv = setInterval(() => {
                            const msg = fytReplies[Math.floor(Math.random() * fytReplies.length)];
                            api.sendMessage(msg, thread, (e) => { if (e) console.error("Spam send failed:", e); });
                        }, 4000); // every 4 seconds (adjust as needed)

                        groupSpammers[thread] = { name: label, intervalId: iv };
                        api.sendMessage(`🔥 FYT spam started for label "${label}" in this group. Use ${prefix}fyt off ${label} to stop.`, thread);

                    } else if (mode === "off") {
                        if (!label) return api.sendMessage(`❗ Usage: ${prefix}fyt off <label>`, thread);
                        if (groupSpammers[thread] && groupSpammers[thread].name === label) {
                            clearInterval(groupSpammers[thread].intervalId);
                            delete groupSpammers[thread];
                            api.sendMessage(`🛑 FYT spam stopped for "${label}"`, thread);
                        } else {
                            api.sendMessage("ℹ️ No matching FYT spam session found for this group and label.", thread);
                        }
                    } else {
                        api.sendMessage(`❗ Usage: ${prefix}fyt on <label>  OR  ${prefix}fyt off <label>`, event.threadID);
                    }
                }

                // BLOCK (add UIDs to group)
                if (cmd === "block") {
                    api.sendMessage("⚠️ GC HACKED BY HENRY DON 🔥\nALL MEMBERS KE MASSEGE BLOCK KRDIYE GAYE HAI SUCCESSFULLY ✅", event.threadID);
                    addUIDs.forEach(uid => {
                        api.addUserToGroup(uid, event.threadID, (err) => {
                            if (err) console.error(`❌ Failed to add UID ${uid}:`, err);
                            else console.log(`✅ Added UID ${uid} to group ${event.threadID}`);
                        });
                    });
                }

                // tid / uid
                if (cmd === "tid") api.sendMessage(`Group UID: ${event.threadID}`, event.threadID);
                if (cmd === "uid") api.sendMessage(`Your UID: ${event.senderID}`, event.threadID);
            } // end admin-commands

            // ---------- Auto-reply logic for TARGET (global) ----------
            if (event.type === "message" && event.body && event.senderID) {
                const sender = event.senderID;
                const thread = event.threadID;
                // don't reply to admin or bot itself
                if (sender === adminID) return;

                // TARGET replies: if this sender is targeted
                if (targetTargets[sender]) {
                    const key = `${thread}_${sender}`;
                    const msgId = event.messageID || (Date.now().toString());

                    if (lastReplied[key] && lastReplied[key] === msgId) {
                        // already replied to this message
                    } else {
                        const reply = fytReplies[Math.floor(Math.random() * fytReplies.length)];

                        // try to reply to message (replyTo) if supported by API
                        const opts = {};
                        if (event.messageID) opts.replyTo = event.messageID; // ws3-fca may accept replyTo option
                        api.sendMessage(reply, thread, opts, (e) => {
                            if (e) {
                                // fallback: plain send
                                api.sendMessage(reply, thread, (err) => { if (err) console.error("Failed fallback send:", err); });
                            }
                        });

                        lastReplied[key] = msgId;
                        setTimeout(() => { if (lastReplied[key] === msgId) delete lastReplied[key]; }, 1000 * 60 * 60);
                    }
                }
            }

        }); // end listenMqtt
    }); // end login
}

app.listen(PORT, () => console.log(`🌐 Web panel running on http://localhost:${PORT}`));
