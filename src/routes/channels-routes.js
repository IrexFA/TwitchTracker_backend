const express = require('express')
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const channelsRouter = express.Router();

channelsRouter.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;

        if (page < 1) {
            return res.status(400).json({ error: 'Le paramètre page doit être un entier positif.' });
        }

        const skip = (page - 1) * limit;

        const channels = await prisma.channels.findMany({
            skip: skip,
            take: limit,
            orderBy: {
                followers_count: "desc"
            }
        });

        const totalChannels = await prisma.channels.count();

        const totalPages = Math.ceil(totalChannels / limit);

        res.json({
            data: channels,
            meta: {
                totalItems: totalChannels,
                totalPages: totalPages,
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des chaînes' });
    }
});

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
