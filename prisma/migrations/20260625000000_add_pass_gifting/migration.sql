ALTER TABLE "fans" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "fans_email_key" ON "fans"("email");

ALTER TABLE "passes" ADD COLUMN "metadata" JSONB;
