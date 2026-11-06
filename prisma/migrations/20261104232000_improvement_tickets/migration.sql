CREATE TYPE "ImprovementStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SOLVED');
CREATE TYPE "ImprovementPriority" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI', 'KRITIS');

CREATE TABLE "ImprovementTicket" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "solution" TEXT NOT NULL,
  "reference" TEXT,
  "priority" "ImprovementPriority" NOT NULL DEFAULT 'SEDANG',
  "status" "ImprovementStatus" NOT NULL DEFAULT 'OPEN',
  "creatorId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "resolution" TEXT,
  "evidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImprovementTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImprovementTicket_status_idx" ON "ImprovementTicket"("status");
CREATE INDEX "ImprovementTicket_priority_idx" ON "ImprovementTicket"("priority");
CREATE INDEX "ImprovementTicket_assigneeId_idx" ON "ImprovementTicket"("assigneeId");
