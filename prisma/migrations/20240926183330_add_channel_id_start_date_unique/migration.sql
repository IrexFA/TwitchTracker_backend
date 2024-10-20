-- CreateTable
CREATE TABLE `channels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `twitch_channel_id` INTEGER NOT NULL,
    `name` TEXT NOT NULL,
    `profile_image_url` TEXT NOT NULL,
    `followers_count` INTEGER NOT NULL,

    UNIQUE INDEX `twitch_channel_id`(`twitch_channel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `channels_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel_id` INTEGER NOT NULL,
    `followers_count` INTEGER NOT NULL,
    `timestamp` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_channels_record_channels`(`channel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `games` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `twitch_game_id` INTEGER NOT NULL,
    `game_image_url` TEXT NOT NULL,
    `name` TEXT NOT NULL,

    UNIQUE INDEX `twitch_game_id`(`twitch_game_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `games_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `total_streams` INTEGER NOT NULL,
    `total_viewers` INTEGER NOT NULL,
    `timestamp` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_games_records_games`(`game_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel_id` INTEGER NOT NULL,
    `start_date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `end_date` DATETIME(0) NULL,

    INDEX `fk_streams_channels`(`channel_id`),
    UNIQUE INDEX `streams_channel_id_start_date_key`(`channel_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streams_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stream_id` INTEGER NOT NULL,
    `viewer_count` INTEGER NOT NULL,
    `title` TEXT NOT NULL,
    `game_id` INTEGER NOT NULL,
    `timestamp` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_streams_records_games`(`game_id`),
    INDEX `fk_streams_records_streams`(`stream_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `channels_records` ADD CONSTRAINT `fk_channels_record_channels` FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `games_records` ADD CONSTRAINT `fk_games_records_games` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streams` ADD CONSTRAINT `fk_streams_channels` FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streams_records` ADD CONSTRAINT `fk_streams_records_games` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streams_records` ADD CONSTRAINT `fk_streams_records_streams` FOREIGN KEY (`stream_id`) REFERENCES `streams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
