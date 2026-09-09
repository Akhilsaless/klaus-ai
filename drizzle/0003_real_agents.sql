CREATE TABLE `agent_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `stepId` int,
  `userId` int NOT NULL,
  `agentId` varchar(64) NOT NULL,
  `status` enum('queued','running','waiting_approval','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  `autonomy` enum('observe','suggest','prepare','approval','autonomous','delegated') NOT NULL DEFAULT 'prepare',
  `input` json DEFAULT ('{}'),
  `output` json DEFAULT ('{}'),
  `errorMessage` text,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `approval_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `taskId` int NOT NULL,
  `agentRunId` int,
  `agentId` varchar(64) NOT NULL,
  `action` varchar(256) NOT NULL,
  `risk` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('pending','approved','denied','expired','cancelled') NOT NULL DEFAULT 'pending',
  `reason` text,
  `payload` json DEFAULT ('{}'),
  `decidedByUserId` int,
  `decidedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `approval_requests_id` PRIMARY KEY(`id`)
);
