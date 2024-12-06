const io = require("socket.io")(process.env.CHANNELS_SERVER_PORT || 4567, {
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