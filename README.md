# ToonKits

A real multiplayer 3D voxel/avatar game — Node.js + Socket.io server (true live WebSocket connections, not polling), Three.js client, real accounts with hashed passwords, a shared buildable world, and live chat.

## Run it (Linux Mint, Node already installed)

1. Unzip/copy this folder, then open a terminal in it.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   node server.js
   ```
   You'll see:
   ```
   ToonKits server running!
     Local:   http://localhost:3000
     On LAN:  http://<your-computer-ip>:3000
   ```
4. Open `http://localhost:3000` in your browser. Sign up with a username + password, pick your avatar color, and you're in.

## Playing with friends

- **Same WiFi / LAN:** find your computer's local IP (`ip a` or `hostname -I` in a terminal), give friends `http://<that-ip>:3000`. Their devices need to be on the same network.
- **Over the internet:** you'll need to either port-forward port 3000 on your router to your machine, or deploy this same code to a free host (Render, Railway, Fly.io all support Node.js) and share that public URL instead. The code doesn't change — only where it runs.

## Controls

- `WASD` — move
- Click + drag mouse — look around
- `E` — place a block (in the direction you're looking)
- `Q` — remove the block you're looking at
- `1`–`6` — pick a block color
- `Enter` — open/send chat

## How the "real multiplayer" works

- Every player is a live WebSocket connection to `server.js`.
- Player positions, block placements/removals, and chat messages are broadcast instantly to everyone connected — this is genuine real-time networking, not a polling trick.
- Accounts are stored in `accounts.json` with bcrypt-hashed passwords (never plaintext).
- The shared world and chat history live in the server's memory and get sent to anyone who joins, so latecomers see the current state. Restarting the server clears the world (it's not saved to disk) — let me know if you want the world persisted to a file too, that's a small addition.

## Known limits / honest scope

This is a real, working multiplayer game, but it is **not** a Roblox clone in scale:
- No physics engine, no scripting API, no asset marketplace, no mobile app.
- Simple arcade-style movement/building, not a full voxel-collision engine.
- If a player's connection drops mid-session, they'll need to refresh and rejoin (no reconnect-resume yet).

Happy to extend any part of this — persistence to disk, more block shapes, jumping/physics, friend lists, private servers, whatever direction you want to take it.
