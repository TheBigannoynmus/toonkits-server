// ============================================================
// TOONKITS SERVER
// A real Node.js + Socket.io multiplayer server:
// - Account signup/login (hashed passwords, stored in accounts.json)
// - Live shared world (players can build/remove blocks, everyone sees it)
// - Live player positions broadcast over real WebSocket connections
// - Live chat
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ---------- Accounts (persisted to disk) ----------
function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
  } catch {
    return {};
  }
}
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}
let accounts = loadAccounts(); // { username: { passwordHash, color } }

// ---------- Live game state (in memory, resets when server restarts) ----------
let players = {};      // socket.id -> { username, color, x, y, z, ry }
let world = {};         // "x,y,z" -> color
let chatLog = [];       // last 100 messages { username, color, text, ts }
const MAX_CHAT = 100;

function publicPlayerList() {
  const out = {};
  for (const id in players) out[id] = players[id];
  return out;
}

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ---- Signup ----
  socket.on("signup", ({ username, password }, cb) => {
    username = String(username || "").trim();
    if (!username || username.length < 3 || username.length > 16) {
      return cb({ ok: false, error: "Username must be 3-16 characters." });
    }
    if (!password || password.length < 4) {
      return cb({ ok: false, error: "Password must be at least 4 characters." });
    }
    if (accounts[username]) {
      return cb({ ok: false, error: "That username is already taken." });
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    accounts[username] = {
      passwordHash,
      color: { skin: "#f5c518", shirt: "#1f6fbf", pants: "#7cb342" },
    };
    saveAccounts(accounts);
    cb({ ok: true });
  });

  // ---- Login ----
  socket.on("login", ({ username, password }, cb) => {
    username = String(username || "").trim();
    const acct = accounts[username];
    if (!acct) return cb({ ok: false, error: "No account with that username." });
    if (!bcrypt.compareSync(password || "", acct.passwordHash)) {
      return cb({ ok: false, error: "Wrong password." });
    }
    cb({ ok: true, color: acct.color });
  });

  // ---- Join the world (after login/signup) ----
  socket.on("join", ({ username, color }) => {
    players[socket.id] = { username, color, x: 0, y: 0.5, z: 0, ry: 0 };
    if (accounts[username]) {
      accounts[username].color = color;
      saveAccounts(accounts);
    }

    // send the new player everything they need
    socket.emit("init", {
      you: socket.id,
      players: publicPlayerList(),
      world,
      chatLog,
    });

    // tell everyone else
    socket.broadcast.emit("playerJoined", { id: socket.id, player: players[socket.id] });

    const sysMsg = { username: "SERVER", color: "#888888", text: `${username} joined the world.`, ts: Date.now() };
    chatLog.push(sysMsg);
    if (chatLog.length > MAX_CHAT) chatLog.shift();
    io.emit("chatMessage", sysMsg);

    console.log(`[join] ${username} (${socket.id})`);
  });

  // ---- Movement (broadcast to everyone else, real-time) ----
  socket.on("move", (data) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = data.x; p.y = data.y; p.z = data.z; p.ry = data.ry;
    socket.broadcast.emit("playerMoved", { id: socket.id, x: p.x, y: p.y, z: p.z, ry: p.ry });
  });

  // ---- Building ----
  socket.on("placeBlock", ({ x, y, z, color }) => {
    const key = `${x},${y},${z}`;
    world[key] = color;
    io.emit("blockPlaced", { x, y, z, color });
  });

  socket.on("removeBlock", ({ x, y, z }) => {
    const key = `${x},${y},${z}`;
    delete world[key];
    io.emit("blockRemoved", { x, y, z });
  });

  // ---- Chat ----
  socket.on("chat", (text) => {
    const p = players[socket.id];
    if (!p) return;
    text = String(text || "").slice(0, 300);
    if (!text.trim()) return;
    const msg = { username: p.username, color: (p.color && p.color.shirt) || "#3a86ff", text, ts: Date.now() };
    chatLog.push(msg);
    if (chatLog.length > MAX_CHAT) chatLog.shift();
    io.emit("chatMessage", msg);
  });

  // ---- Disconnect ----
  socket.on("disconnect", () => {
    const p = players[socket.id];
    if (p) {
      delete players[socket.id];
      io.emit("playerLeft", { id: socket.id });
      const sysMsg = { username: "SERVER", color: "#888888", text: `${p.username} left.`, ts: Date.now() };
      chatLog.push(sysMsg);
      if (chatLog.length > MAX_CHAT) chatLog.shift();
      io.emit("chatMessage", sysMsg);
      console.log(`[leave] ${p.username} (${socket.id})`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nToonKits server running!`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  On LAN:  http://<your-computer-ip>:${PORT}  (friends on same WiFi)\n`);
});
