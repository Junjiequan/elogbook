import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Marks the sample logbooks (`POST /demo`) with the person they were made for. */
export class DemoLogbooks1760000000001 implements MigrationInterface {
  name = 'DemoLogbooks1760000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "logbooks" ADD "demo_user_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_2947c33b3c07d320c21e491387" ON "logbooks"  ("demo_user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbooks" ADD CONSTRAINT "FK_2947c33b3c07d320c21e4913876" FOREIGN KEY ("demo_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "logbooks" DROP CONSTRAINT "FK_2947c33b3c07d320c21e4913876"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_2947c33b3c07d320c21e491387"`);
    await queryRunner.query(`ALTER TABLE "logbooks" DROP COLUMN "demo_user_id"`);
  }
}
