/*
  Warnings:

  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO `Role` (`name`, `description`, `createdAt`, `updatedAt`) VALUES
('MAIN_DOCTOR', 'Main doctor with administrative privileges', NOW(), NOW()),
('DENTIST', 'Dentist with treatment privileges', NOW(), NOW()),
('RECEPTIONIST', 'Receptionist with appointment management privileges', NOW(), NOW()),
('CUSTOMER', 'Regular customer/patient', NOW(), NOW());

-- Add roleId to User table
ALTER TABLE `User` ADD COLUMN `roleId` INTEGER NULL;

-- Update existing users with CUSTOMER role
UPDATE `User` SET `roleId` = (SELECT `id` FROM `Role` WHERE `name` = 'CUSTOMER');

-- Make roleId required
ALTER TABLE `User` MODIFY `roleId` INTEGER NOT NULL;

-- Add foreign key constraint
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old role column
ALTER TABLE `User` DROP COLUMN `role`;
