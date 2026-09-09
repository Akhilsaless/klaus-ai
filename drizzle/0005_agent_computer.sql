CREATE TABLE `computer_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `taskId` int,
  `agentRunId` int,
  `agentId` varchar(64) NOT NULL,
  `runtimeId` enum('cloud_browser','desktop_companion','browser_extension','api_tools') NOT NULL,
  `mode` enum('tool','visual_computer') NOT NULL,
  `state` enum('queued','starting','running','paused','waiting_approval','takeover','completed','failed','stopped') NOT NULL DEFAULT 'queued',
  `goal` text NOT NULL,
  `externalSessionId` varchar(512),
  `viewerUrl` varchar(2048),
  `capabilities` json DEFAULT ('{}'),
  `metadata` json DEFAULT ('{}'),
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `computer_sessions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `computer_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionId` int NOT NULL,
  `userId` int NOT NULL,
  `sequence` int NOT NULL,
  `type` enum('status','action','screenshot','tool','approval','takeover','error','note') NOT NULL,
  `summary` text NOT NULL,
  `payload` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `computer_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `computer_control_leases` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionId` int NOT NULL,
  `userId` int NOT NULL,
  `status` enum('active','released','expired','revoked') NOT NULL DEFAULT 'active',
  `leaseTokenHash` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `releasedAt` timestamp NULL,
  CONSTRAINT `computer_control_leases_id` PRIMARY KEY(`id`)
);
