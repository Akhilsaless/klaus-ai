ALTER TABLE `users`
  MODIFY COLUMN `role` enum('user','reviewer','manager','admin','super_admin') NOT NULL DEFAULT 'user';

CREATE TABLE `ai_provider_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` enum('free','openai') NOT NULL,
  `enabled` int NOT NULL DEFAULT 1,
  `model` varchar(128),
  `secretRef` varchar(512),
  `settings` json DEFAULT ('{}'),
  `updatedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ai_provider_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `ai_provider_configs_provider_unique` UNIQUE(`provider`)
);

CREATE TABLE `audit_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int,
  `action` varchar(128) NOT NULL,
  `resourceType` varchar(128),
  `resourceId` varchar(256),
  `risk` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
  `result` enum('allowed','denied','failed') NOT NULL,
  `metadata` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_audit_events_user_created`
  ON `audit_events` (`userId`, `createdAt`);
CREATE INDEX `idx_audit_events_action_created`
  ON `audit_events` (`action`, `createdAt`);
