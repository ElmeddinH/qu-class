-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "systemRole" TEXT NOT NULL DEFAULT 'USER',
    "stage" TEXT NOT NULL DEFAULT 'INCOMING',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "hometown" TEXT,
    "currentCity" TEXT,
    "currentCountry" TEXT,
    "phone" TEXT,
    "personalEmail" TEXT,
    "bio" TEXT,
    "learningGoals" TEXT,
    "askMeAbout" TEXT,
    "expectations" TEXT,
    "currentCompany" TEXT,
    "currentPosition" TEXT,
    "industry" TEXT,
    "futurePlans" TEXT,
    "openToSupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT 'BACHELOR',
    "facultyId" TEXT NOT NULL,
    CONSTRAINT "Program_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'PROGRAM',
    "facultyId" TEXT,
    "programId" TEXT,
    "admissionYear" INTEGER NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "academicStartsAt" DATETIME NOT NULL,
    "graduatesAt" DATETIME NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "welcomeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cohort_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CohortMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CohortMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CohortMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldVisibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'CLASS',
    CONSTRAINT "FieldVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserTag" (
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "level" TEXT,

    PRIMARY KEY ("userId", "tagId"),
    CONSTRAINT "UserTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "linkUrl" TEXT,
    "linkTitle" TEXT,
    "linkImage" TEXT,
    "referencedEventId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    "showOnTimeline" BOOLEAN NOT NULL DEFAULT false,
    "showInAchievements" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_referencedEventId_fkey" FOREIGN KEY ("referencedEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "eventId" TEXT,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "type" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reaction" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("postId", "userId"),
    CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "postId" TEXT,
    "achievementId" TEXT,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "academicYear" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    "isSystemMilestone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEntry_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEntry_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEntry_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "postId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dedicatedTo" TEXT,
    "imageUrl" TEXT,
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
    CONSTRAINT "Memory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "postId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organization" TEXT,
    "proofUrl" TEXT,
    "imageUrl" TEXT,
    "awardedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    "verifiedById" TEXT,
    "verifiedAt" DATETIME,
    "verifyNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Achievement_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Achievement_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Achievement_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "industry" TEXT,
    "city" TEXT,
    "country" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "includeInStats" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    CONSTRAINT "CareerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT,
    "country" TEXT,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "includeInStats" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    CONSTRAINT "EducationEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "SupportOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "category" TEXT
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "clubId"),
    CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT,
    "clubId" TEXT,
    "facultyId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'CLASS',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agenda" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "onlineUrl" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "registrationDeadline" DATETIME,
    "coverUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "contactId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'CLASS',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "summary" TEXT,
    "attendeeCount" INTEGER,
    "addedToTimeline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventRSVP" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "registeredAt" DATETIME,
    "checkedInAt" DATETIME,
    "rating" INTEGER,
    "feedback" TEXT,
    CONSTRAINT "EventRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverUrl" TEXT,
    "section" TEXT NOT NULL DEFAULT 'UNIVERSITY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "GuidePlace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "imageUrl" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "websiteUrl" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stage_idx" ON "User"("stage");

-- CreateIndex
CREATE INDEX "User_currentCountry_currentCity_idx" ON "User"("currentCountry", "currentCity");

-- CreateIndex
CREATE INDEX "User_industry_idx" ON "User"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_name_key" ON "Faculty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_slug_key" ON "Faculty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Program_facultyId_slug_key" ON "Program"("facultyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_slug_key" ON "Cohort"("slug");

-- CreateIndex
CREATE INDEX "Cohort_admissionYear_graduationYear_idx" ON "Cohort"("admissionYear", "graduationYear");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_scope_facultyId_programId_admissionYear_key" ON "Cohort"("scope", "facultyId", "programId", "admissionYear");

-- CreateIndex
CREATE INDEX "CohortMembership_cohortId_role_idx" ON "CohortMembership"("cohortId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CohortMembership_userId_cohortId_key" ON "CohortMembership"("userId", "cohortId");

-- CreateIndex
CREATE INDEX "FieldVisibility_userId_idx" ON "FieldVisibility"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldVisibility_userId_field_key" ON "FieldVisibility"("userId", "field");

-- CreateIndex
CREATE INDEX "Tag_type_idx" ON "Tag"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_type_slug_key" ON "Tag"("type", "slug");

-- CreateIndex
CREATE INDEX "UserTag_tagId_idx" ON "UserTag"("tagId");

-- CreateIndex
CREATE INDEX "Post_cohortId_createdAt_idx" ON "Post"("cohortId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_cohortId_category_idx" ON "Post"("cohortId", "category");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "MediaAsset_postId_idx" ON "MediaAsset"("postId");

-- CreateIndex
CREATE INDEX "MediaAsset_eventId_idx" ON "MediaAsset"("eventId");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEntry_postId_key" ON "TimelineEntry"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEntry_achievementId_key" ON "TimelineEntry"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEntry_eventId_key" ON "TimelineEntry"("eventId");

-- CreateIndex
CREATE INDEX "TimelineEntry_cohortId_occurredAt_idx" ON "TimelineEntry"("cohortId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimelineEntry_cohortId_academicYear_idx" ON "TimelineEntry"("cohortId", "academicYear");

-- CreateIndex
CREATE INDEX "TimelineEntry_category_idx" ON "TimelineEntry"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Memory_postId_key" ON "Memory"("postId");

-- CreateIndex
CREATE INDEX "Memory_cohortId_createdAt_idx" ON "Memory"("cohortId", "createdAt");

-- CreateIndex
CREATE INDEX "Memory_type_idx" ON "Memory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_postId_key" ON "Achievement"("postId");

-- CreateIndex
CREATE INDEX "Achievement_cohortId_status_idx" ON "Achievement"("cohortId", "status");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "CareerEntry_userId_idx" ON "CareerEntry"("userId");

-- CreateIndex
CREATE INDEX "CareerEntry_industry_idx" ON "CareerEntry"("industry");

-- CreateIndex
CREATE INDEX "CareerEntry_country_city_idx" ON "CareerEntry"("country", "city");

-- CreateIndex
CREATE INDEX "EducationEntry_userId_idx" ON "EducationEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOffer_userId_type_key" ON "SupportOffer"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Event_cohortId_startsAt_idx" ON "Event"("cohortId", "startsAt");

-- CreateIndex
CREATE INDEX "Event_scope_startsAt_idx" ON "Event"("scope", "startsAt");

-- CreateIndex
CREATE INDEX "Event_category_startsAt_idx" ON "Event"("category", "startsAt");

-- CreateIndex
CREATE INDEX "Event_facultyId_idx" ON "Event"("facultyId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "EventRSVP_eventId_status_idx" ON "EventRSVP"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventRSVP_eventId_userId_key" ON "EventRSVP"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_entityType_entityId_idx" ON "Report"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");

-- CreateIndex
CREATE INDEX "ContentPage_section_order_idx" ON "ContentPage"("section", "order");

-- CreateIndex
CREATE INDEX "Faq_category_order_idx" ON "Faq"("category", "order");

-- CreateIndex
CREATE INDEX "GuidePlace_category_order_idx" ON "GuidePlace"("category", "order");
