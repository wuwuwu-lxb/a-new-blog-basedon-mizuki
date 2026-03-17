-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" INTEGER,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestUrl" TEXT,
    "articleId" INTEGER,
    "articleSlug" TEXT,
    "parentId" INTEGER,
    CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_comments" ("articleId", "authorId", "content", "createdAt", "guestEmail", "guestName", "guestUrl", "id", "parentId", "status", "updatedAt") SELECT "articleId", "authorId", "content", "createdAt", "guestEmail", "guestName", "guestUrl", "id", "parentId", "status", "updatedAt" FROM "comments";
DROP TABLE "comments";
ALTER TABLE "new_comments" RENAME TO "comments";
CREATE UNIQUE INDEX "comments_articleId_articleSlug_key" ON "comments"("articleId", "articleSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
