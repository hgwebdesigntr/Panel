-- Add notificationEmail to Settings
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT NOT NULL DEFAULT '';

-- Create NotificationLog table
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "daysLeft" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleKey" TEXT NOT NULL,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationLog_serverId_daysLeft_cycleKey_key"
    ON "NotificationLog"("serverId", "daysLeft", "cycleKey");

CREATE INDEX IF NOT EXISTS "NotificationLog_serverId_idx"
    ON "NotificationLog"("serverId");
