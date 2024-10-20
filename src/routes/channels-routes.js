const express = require('express')
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const channelsRouter = express.Router();

channelsRouter.get('/', async (req, res) => {
    const channels = await prisma.channels.findMany();
    res.json(channels);
})

channelsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const channel = await prisma.channels.findUnique({
        where: { id: parseInt(id) },
    });

    if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
    }

    const channelRecords = await prisma.channels_records.findMany({
        where: { channel_id: parseInt(id) },
    });

    const channelStreams = await prisma.streams.findMany({
        where: { channel_id: parseInt(id) },
        include: {
            streams_records: true,
        },
    });

    res.json({
        id: channel.id,
        name: channel.name,
        image_url: channel.profile_image_url,
        followers_count: channel.followers_count,
        records: channelRecords,
        streams: channelStreams
    });
});
module.exports = channelsRouter;