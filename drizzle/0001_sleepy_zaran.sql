CREATE TABLE `evolution_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`instanceName` varchar(128) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'disconnected',
	`phone` varchar(64),
	`battery` varchar(16) DEFAULT '-',
	`qrCode` text,
	`apiUrl` text,
	`apiKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evolution_instances_id` PRIMARY KEY(`id`)
);
