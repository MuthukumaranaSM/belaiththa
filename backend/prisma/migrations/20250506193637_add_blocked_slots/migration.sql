/*
  Warnings:

  - Added the required column `dentistId` to the `BlockedSlot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `blockedslot` ADD COLUMN `dentistId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `BlockedSlot_dentistId_idx` ON `BlockedSlot`(`dentistId`);

-- AddForeignKey
ALTER TABLE `BlockedSlot` ADD CONSTRAINT `BlockedSlot_dentistId_fkey` FOREIGN KEY (`dentistId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
