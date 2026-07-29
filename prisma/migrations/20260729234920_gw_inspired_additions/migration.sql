-- AlterTable
ALTER TABLE "CareerEntry" ADD COLUMN "jobFunction" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "postId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dedicatedTo" TEXT,
    "imageUrl" TEXT,
    "guidePlaceId" TEXT,
    "showInProfile" BOOLEAN NOT NULL DEFAULT true,
    "showInFeed" BOOLEAN NOT NULL DEFAULT true,
    "showInTimeline" BOOLEAN NOT NULL DEFAULT false,
    "showInYearbook" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Memory_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Memory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Memory_guidePlaceId_fkey" FOREIGN KEY ("guidePlaceId") REFERENCES "GuidePlace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Memory" ("authorId", "body", "cohortId", "createdAt", "dedicatedTo", "id", "imageUrl", "occurredAt", "postId", "showInFeed", "showInProfile", "showInTimeline", "showInYearbook", "status", "title", "type", "visibility") SELECT "authorId", "body", "cohortId", "createdAt", "dedicatedTo", "id", "imageUrl", "occurredAt", "postId", "showInFeed", "showInProfile", "showInTimeline", "showInYearbook", "status", "title", "type", "visibility" FROM "Memory";
DROP TABLE "Memory";
ALTER TABLE "new_Memory" RENAME TO "Memory";
CREATE UNIQUE INDEX "Memory_postId_key" ON "Memory"("postId");
CREATE INDEX "Memory_cohortId_createdAt_idx" ON "Memory"("cohortId", "createdAt");
CREATE INDEX "Memory_type_idx" ON "Memory"("type");
CREATE INDEX "Memory_guidePlaceId_idx" ON "Memory"("guidePlaceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CareerEntry_jobFunction_idx" ON "CareerEntry"("jobFunction");
