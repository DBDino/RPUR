ALTER TABLE "Room" RENAME COLUMN "faculty" TO "faculties";
ALTER TABLE "Room"
  ALTER COLUMN "faculties" TYPE TEXT[]
  USING CASE
    WHEN "faculties" IS NULL THEN ARRAY[]::TEXT[]
    ELSE ARRAY["faculties"]
  END;
ALTER TABLE "Room" ALTER COLUMN "faculties" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Room" ALTER COLUMN "faculties" SET NOT NULL;

DROP INDEX IF EXISTS "Room_faculty_idx";
CREATE INDEX "Room_faculties_idx" ON "Room" USING GIN ("faculties");
