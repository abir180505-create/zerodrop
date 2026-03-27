const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
// app.use(cors({
//   //origin: "https://your-app.netlify.app",
//   methods: ["GET", "POST"]
// }));
/* For development, allow all origins. In production, specify your frontend URL. */
app.use(cors({
  origin: "*"
}));

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ DEFINE ROOMS OUTSIDE
let rooms = {};

wss.on("connection", (ws) => {
  console.log("User connected");

  ws.on("message", (message) => {
    let data;

    try {
       data = JSON.parse(message);
    } catch (err) {
       console.error("Invalid JSON:", message);
    return;
   }
    
    

    switch (data.type) {

      // 🟢 JOIN ROOM
       case "join": {
  const roomId = data.roomId;

  if (!rooms[roomId]) {
    rooms[roomId] = [];
  }

  // avoid duplicate
  if (!rooms[roomId].includes(ws)) {
    rooms[roomId].push(ws);
  }

  ws.roomId = roomId;

  console.log("User joined room:", roomId);

  // 🔥 VERY IMPORTANT: notify others in room
  rooms[roomId].forEach(client => {
    if (client !== ws) {
      client.send(JSON.stringify({
        type: "peer-joined"
      }));
    }
  });

  break;
}

      // 🟢 SIGNALING (OFFER / ANSWER / ICE)
      case "offer":
      case "answer":
      case "ice-candidate": {
        const room = rooms[ws.roomId];

        if (room) {
          room.forEach(client => {
            if (client !== ws) {
              client.send(JSON.stringify(data));
            }
          });
        }

        break;
      }

      // 🟢 OPTIONAL DISCONNECT
      case "disconnect": {
        const room = rooms[ws.roomId];

        if (room) {
          rooms[ws.roomId] = room.filter(client => client !== ws);
        }

        console.log("User disconnected");
        break;
      }
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];

    if (room) {
      rooms[ws.roomId] = room.filter(client => client !== ws);
    }

    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Signaling server running on port " + PORT);
});