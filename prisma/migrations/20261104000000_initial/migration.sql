-- Initial schema
CREATE TYPE "Day" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'KAPRODI', 'SARPRAS', 'VIEWER');
CREATE TYPE "TicketStatus" AS ENUM ('DIAJUKAN', 'DALAM_PENINJAUAN', 'DISETUJUI', 'DITOLAK');
CREATE TYPE "TicketType" AS ENUM ('PEMINJAMAN', 'PERUBAHAN_JADWAL');
CREATE TYPE "FlagType" AS ENUM ('INFO', 'WARNING');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "building" TEXT,
  "floor" TEXT,
  "capacitySeat" INTEGER NOT NULL,
  "maxDailyMinutes" INTEGER NOT NULL DEFAULT 360,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE INDEX "Room_code_idx" ON "Room"("code");

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

CREATE TABLE "Schedule" (
  "id" TEXT NOT NULL,
  "sourceCode" TEXT,
  "roomId" TEXT NOT NULL,
  "courseId" TEXT,
  "day" "Day" NOT NULL,
  "startMinutes" INTEGER NOT NULL,
  "endMinutes" INTEGER NOT NULL,
  "enrolledStudents" INTEGER NOT NULL DEFAULT 0,
  "className" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Schedule_sourceCode_key" ON "Schedule"("sourceCode");
CREATE INDEX "Schedule_roomId_day_startMinutes_endMinutes_idx" ON "Schedule"("roomId", "day", "startMinutes", "endMinutes");
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "submitterId" TEXT NOT NULL,
  "targetRoomId" TEXT NOT NULL,
  "sourceScheduleId" TEXT,
  "type" "TicketType" NOT NULL DEFAULT 'PEMINJAMAN',
  "targetDay" "Day" NOT NULL,
  "startMinutes" INTEGER NOT NULL,
  "endMinutes" INTEGER NOT NULL,
  "enrolledStudents" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'DIAJUKAN',
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Ticket_targetRoomId_targetDay_startMinutes_endMinutes_idx" ON "Ticket"("targetRoomId", "targetDay", "startMinutes", "endMinutes");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_targetRoomId_fkey" FOREIGN KEY ("targetRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TicketFlag" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "type" "FlagType" NOT NULL,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TicketFlag_ticketId_code_key" ON "TicketFlag"("ticketId", "code");
ALTER TABLE "TicketFlag" ADD CONSTRAINT "TicketFlag_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
