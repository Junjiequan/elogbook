import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A logbook gets an `owner`: the person responsible for it. Existing logbooks take the member who is
 * an owner (the one who has been one the longest is not recorded, so the lowest id is used for the
 * rare logbook with several), and only then does the column become required.
 */
export class LogbookOwner1760000000002 implements MigrationInterface {
  name = 'LogbookOwner1760000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "logbooks" ADD "owner_id" uuid`);
    await queryRunner.query(
      `UPDATE "logbooks" SET "owner_id" = (
         SELECT m."user_id" FROM "logbook_members" m
         WHERE m."logbook_id" = "logbooks"."id" AND m."role" = 'owner'
         ORDER BY m."user_id" LIMIT 1)`,
    );
    // A logbook that somehow has no owner member cannot be given one: it is removed rather than left unowned.
    await queryRunner.query(`DELETE FROM "logbooks" WHERE "owner_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "logbooks" ALTER COLUMN "owner_id" SET NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_2c954bb3783da2277ec8fbd37b" ON "logbooks"  ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "logbooks" ADD CONSTRAINT "FK_2c954bb3783da2277ec8fbd37be" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "logbooks" DROP CONSTRAINT "FK_2c954bb3783da2277ec8fbd37be"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_2c954bb3783da2277ec8fbd37b"`);
    await queryRunner.query(`ALTER TABLE "logbooks" DROP COLUMN "owner_id"`);
  }
}
