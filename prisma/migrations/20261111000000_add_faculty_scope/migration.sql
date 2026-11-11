ALTER TABLE "User" ADD COLUMN "faculty" TEXT;
ALTER TABLE "Room" ADD COLUMN "faculty" TEXT;

CREATE INDEX "Room_faculty_idx" ON "Room"("faculty");
