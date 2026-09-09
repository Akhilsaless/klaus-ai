CREATE TABLE `teach_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(256),
  `mode` enum('teach','shadow') NOT NULL DEFAULT 'teach',
  `status` enum('recording','processing','completed','cancelled','failed') NOT NULL DEFAULT 'recording',
  `sourceDevice` varchar(128),
  `eventCount` int NOT NULL DEFAULT 0,
  `confidence` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  CONSTRAINT `teach_sessions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `teach_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionId` int NOT NULL,
  `userId` int NOT NULL,
  `sequence` int NOT NULL,
  `kind` enum('app_open','navigation','click','input','file','api','wait','decision','other') NOT NULL DEFAULT 'other',
  `app` varchar(256),
  `action` varchar(512) NOT NULL,
  `target` varchar(512),
  `safeValue` text,
  `metadata` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `teach_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `workflows` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `sourceSessionId` int,
  `name` varchar(256) NOT NULL,
  `description` text,
  `status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
  `autonomy` enum('observe','suggest','prepare','approval','autonomous','delegated') NOT NULL DEFAULT 'prepare',
  `steps` json DEFAULT ('[]'),
  `triggers` json DEFAULT ('[]'),
  `confidence` int NOT NULL DEFAULT 0,
  `version` int NOT NULL DEFAULT 1,
  `reviewRequired` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);

CREATE TABLE `workflow_skills` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `workflowId` int NOT NULL,
  `name` varchar(256) NOT NULL,
  `description` text,
  `visibility` enum('private','workspace') NOT NULL DEFAULT 'private',
  `version` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `workflow_skills_id` PRIMARY KEY(`id`)
);

CREATE TABLE `memory_entities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `entityType` enum('person','project','app','document','device','task','decision','workflow','other') NOT NULL DEFAULT 'other',
  `label` varchar(512) NOT NULL,
  `attributes` json DEFAULT ('{}'),
  `enabled` int NOT NULL DEFAULT 1,
  `learnedFrom` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memory_entities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `memory_edges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `fromEntityId` int NOT NULL,
  `toEntityId` int NOT NULL,
  `relation` varchar(128) NOT NULL,
  `weight` int NOT NULL DEFAULT 100,
  `metadata` json DEFAULT ('{}'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `memory_edges_id` PRIMARY KEY(`id`)
);
