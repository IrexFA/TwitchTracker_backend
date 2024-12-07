const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const app = express();

const channelsRouter = require('./src/routes/channels-routes');
const gamesRouter = require('./src/routes/games-routes');

app.use(cors());
app.use(express.json());

app.use('/channels', channelsRouter);
app.use('/games', gamesRouter);

const API_PORT = process.env.API_PORT || 2727;

const server = http.createServer(app);

const io = socketIo(server, {
    cors: { origin: "*" },
});

const messageHistory = {};

io.on("connection", (socket) => {
    socket.on("joinRoom", ({ channelId }) => {
        socket.join(channelId);

        if (messageHistory[channelId]) {
            socket.emit("messageHistory", messageHistory[channelId]);
        } else {
            messageHistory[channelId] = [];
        }
    });

    socket.on("chatMessage", ({ text, channelId, author }) => {
        const message = { author, text, timestamp: new Date().toLocaleString() };

        console.log(`[+] ${message.timestamp} - Received message from ${message.author} (Channel: ${channelId}) : ${message.text}`)

        if (!messageHistory[channelId]) {
            messageHistory[channelId] = [];
        }
        messageHistory[channelId].push(message);

        if (messageHistory[channelId].length > 100) {
            messageHistory[channelId].shift();
        }

        socket.broadcast.to(channelId).emit("message", message);
    });

    socket.on("disconnect", () => {
    });
});

server.listen(API_PORT, () => {
    console.log("StreamerTracker RESTful API and WebSocket server listening on port " + API_PORT);
});
