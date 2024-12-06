const express = require('express')
const cors = require('cors');
const app = express()
const socketServer = require('./src/sockets/channelSockets');

const channelsRouter = require('./src/routes/channels-routes');
const gamesRouter = require('./src/routes/games-routes');

app.use(cors());
app.use(express.json());

app.use('/channels', channelsRouter);
app.use('/games', gamesRouter);

const API_PORT = process.env.API_PORT || 2727;
app.listen(API_PORT, () => {
    console.log("StreamerTracker RESTful API listening on port " + API_PORT);
})
