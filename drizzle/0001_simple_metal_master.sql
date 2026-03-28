CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`stepId` int,
	`level` enum('info','warn','error','debug') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`conversationHistory` json DEFAULT ('[]'),
	`taskState` json DEFAULT ('{}'),
	`context` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`stepId` int,
	`type` enum('text','code','file','report','email','data','summary') NOT NULL,
	`title` varchar(512),
	`content` text,
	`fileUrl` varchar(2048),
	`fileKey` varchar(512),
	`mimeType` varchar(128),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`stepIndex` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text,
	`tool` varchar(64),
	`status` enum('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`input` json,
	`output` text,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`goal` text NOT NULL,
	`status` enum('pending','planning','executing','verifying','completed','failed') NOT NULL DEFAULT 'pending',
	`plan` json DEFAULT ('[]'),
	`summary` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
