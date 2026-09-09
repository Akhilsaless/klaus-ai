CREATE TABLE `devices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `deviceKey` varchar(128) NOT NULL,
  `name` varchar(256) NOT NULL,
  `platform` enum('windows','macos','android','ios','web','cloud') NOT NULL,
  `status` enum('active','offline','revoked') NOT NULL DEFAULT 'active',
  `capabilities` json DEFAULT ('[]'),
  `pushEndpointRef` varchar(512),
  `lastSeenAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);

CREATE TABLE `device_handoffs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `taskId` int,
  `computerSessionId` int,
  `fromDeviceId` int,
  `toDeviceId` int,
  `status` enum('requested','accepted','in_progress','completed','cancelled','failed') NOT NULL DEFAULT 'requested',
  `context` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  CONSTRAINT `device_handoffs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `voice_profiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(256) NOT NULL,
  `profileType` enum('built_in','authorized_custom') NOT NULL DEFAULT 'built_in',
  `provider` enum('local','openai') NOT NULL DEFAULT 'local',
  `providerVoiceId` varchar(512),
  `consentStatus` enum('not_required','pending','granted','revoked') NOT NULL DEFAULT 'not_required',
  `consentTextHash` varchar(128),
  `sourceRecordingRef` varchar(1024),
  `enabled` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `voice_profiles_id` PRIMARY KEY(`id`)
);

CREATE TABLE `voice_wake_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `deviceId` int NOT NULL,
  `enabled` int NOT NULL DEFAULT 0,
  `wakePhrase` varchar(64) NOT NULL DEFAULT 'Hey Klaus',
  `strategy` enum('local_hotword','shortcut_or_push','not_supported') NOT NULL,
  `localOnly` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `voice_wake_settings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `voice_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `deviceId` int,
  `provider` enum('local','openai') NOT NULL,
  `mode` enum('standard','premium_realtime') NOT NULL DEFAULT 'standard',
  `status` enum('starting','active','interrupted','completed','failed') NOT NULL DEFAULT 'starting',
  `metadata` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  CONSTRAINT `voice_sessions_id` PRIMARY KEY(`id`)
);
