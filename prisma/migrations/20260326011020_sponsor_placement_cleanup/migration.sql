DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Sponsor"
    WHERE "placement"::text = 'SCHEDULE'
  ) THEN
    RAISE EXCEPTION 'Cannot migrate SponsorPlacement because one or more sponsors still use SCHEDULE. Update those sponsors first.';
  END IF;
END $$;

CREATE TYPE "SponsorPlacement_new" AS ENUM ('HOME', 'STANDINGS', 'TOURNAMENT');

ALTER TABLE "Sponsor"
  ALTER COLUMN "placement" TYPE "SponsorPlacement_new"
  USING (
    CASE
      WHEN "placement"::text = 'HEADER' THEN 'HOME'
      WHEN "placement"::text = 'BRACKET' THEN 'TOURNAMENT'
      WHEN "placement"::text = 'STANDINGS' THEN 'STANDINGS'
      ELSE NULL
    END
  )::"SponsorPlacement_new";

DROP TYPE "SponsorPlacement";

ALTER TYPE "SponsorPlacement_new" RENAME TO "SponsorPlacement";