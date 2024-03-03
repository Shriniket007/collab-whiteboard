// version 4
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("client-ready", ({ room, userName }) => {
    socket.join(room);
    socket.to(room).emit("user-joined", userName);
    socket.to(room).emit("get-canvas-state");
  });

  socket.on("canvas-state", (state, room) => {
    console.log("received canvas state");
    socket.to(room).emit("canvas-state-from-server", state);
  });

  socket.on("draw-line", ({ prevPoint, currentPoint, color }, room) => {
    socket.to(room).emit("draw-line", { prevPoint, currentPoint, color });
  });

  socket.on("clear", (room) => io.to(room).emit("clear"));

  socket.on("send-message", (message, room) => {
    socket.to(room).emit("receive-message", message);
  });
});

server.listen(3001, () => {
  console.log("✔️ Server listening on port 3001");
});

// verison 3
// const express = require("express");
// const http = require("http");
// const app = express();
// const server = http.createServer(app);

// import { Server } from "socket.io";
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

// type Point = { x: number; y: number };

// type DrawLine = {
//   prevPoint: Point | null;
//   currentPoint: Point;
//   color: string;
// };

// io.on("connection", (socket) => {
//   socket.on("client-ready", () => {
//     socket.broadcast.emit("get-canvas-state");
//   });

//   socket.on("canvas-state", (state) => {
//     console.log("received canvas state");
//     socket.broadcast.emit("canvas-state-from-server", state);
//   });

//   socket.on("draw-line", ({ prevPoint, currentPoint, color }: DrawLine) => {
//     socket.broadcast.emit("draw-line", { prevPoint, currentPoint, color });
//   });

//   socket.on("clear", () => io.emit("clear"));

//   socket.on("send-message", (message) => {
//     socket.broadcast.emit("receive-message", message);
//   });
// });

// server.listen(3001, () => {
//   console.log("✔️ Server listening on port 3001");
// });

// version 1
// const express = require('express')
// const http = require('http')
// const app = express()
// const server = http.createServer(app)

// import { Server } from 'socket.io'
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//   },
// })

// type Point = { x: number; y: number }

// type DrawLine = {
//   prevPoint: Point | null
//   currentPoint: Point
//   color: string
// }

// io.on('connection', (socket) => {
//   socket.on('client-ready', () => {
//     socket.broadcast.emit('get-canvas-state')
//   })

//   socket.on('canvas-state', (state) => {
//     console.log('received canvas state')
//     socket.broadcast.emit('canvas-state-from-server', state)
//   })

//   socket.on('draw-line', ({ prevPoint, currentPoint, color }: DrawLine) => {
//     socket.broadcast.emit('draw-line', { prevPoint, currentPoint, color })
//   })

//   socket.on('clear', () => io.emit('clear'))
// })

// server.listen(3001, () => {
//   console.log('✔️ Server listening on port 3001')
// })
