ALTER TABLE "ImprovementTicket" ADD COLUMN "faculty" TEXT;

UPDATE "ImprovementTicket"
SET "faculty" = substring("reference" FROM '^Fakultas: ([^;]+);')
WHERE "reference" ~ '^Fakultas: [^;]+;';

CREATE INDEX "ImprovementTicket_faculty_idx" ON "ImprovementTicket"("faculty");
