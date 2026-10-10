import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The schema: users, logbooks (with their owner) and members, entries, version history and pins.
 * Generated from the entities. Nothing has been deployed yet, so this is edited in place; once a database
 * exists somewhere, every change becomes a new migration next to this one.
 */
export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" text NOT NULL, "name" text NOT NULL, "password_hash" text, "roles" text array NOT NULL DEFAULT '{}', "invited" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_identities" ("issuer" text NOT NULL, "subject" text NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_identities_user_issuer" UNIQUE ("user_id", "issuer"), CONSTRAINT "PK_30e43d5623aba16f806fc50cb99" PRIMARY KEY ("issuer", "subject"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf5fe01eb8cad7114b4c371cdc" ON "user_identities"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "logbook_members" ("logbook_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" text NOT NULL, CONSTRAINT "CHK_logbook_members_role" CHECK (role IN ('owner', 'editor', 'viewer')), CONSTRAINT "PK_09c4ede5cce7f64e2c18ab48827" PRIMARY KEY ("logbook_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_46a9f68b634f0c8bcbad16e906" ON "logbook_members"  ("user_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "logbooks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" text NOT NULL, "description" text NOT NULL DEFAULT '', "instrument" text, "proposal_id" text, "visibility" text NOT NULL DEFAULT 'private', "owner_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_logbooks_visibility" CHECK (visibility IN ('private', 'facility-read')), CONSTRAINT "PK_41810dc7c290a5798ee70ef5cef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c954bb3783da2277ec8fbd37b" ON "logbooks"  ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "logbook_id" uuid NOT NULL, "title" text NOT NULL DEFAULT '', "content" jsonb NOT NULL, "revision" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by_id" uuid NOT NULL, CONSTRAINT "PK_23d4e7e9b58d9939f113832915b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_390e38925d684c2bef88e9fb18" ON "entries"  ("logbook_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "entry_versions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "entry_id" uuid NOT NULL, "title" text NOT NULL, "content" jsonb NOT NULL, "saved_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "saved_by_id" uuid NOT NULL, "reason" text NOT NULL, CONSTRAINT "CHK_entry_versions_reason" CHECK (reason IN ('auto', 'manual', 'restore')), CONSTRAINT "PK_48abf49741cba747dab07021a60" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c164b1b86076d629ded905b405" ON "entry_versions"  ("entry_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "pinned_entries" ("user_id" uuid NOT NULL, "entry_id" uuid NOT NULL, "position" integer NOT NULL, "pinned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_107c90406fec42060e1cfc40072" PRIMARY KEY ("user_id", "entry_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c68f1e5b228c46dfb2f534cbc6" ON "pinned_entries"  ("entry_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_identities" ADD CONSTRAINT "FK_bf5fe01eb8cad7114b4c371cdc7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbook_members" ADD CONSTRAINT "FK_d53a3eb590f6e9147ac113bcf04" FOREIGN KEY ("logbook_id") REFERENCES "logbooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbook_members" ADD CONSTRAINT "FK_46a9f68b634f0c8bcbad16e9066" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbooks" ADD CONSTRAINT "FK_2c954bb3783da2277ec8fbd37be" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entries" ADD CONSTRAINT "FK_390e38925d684c2bef88e9fb18a" FOREIGN KEY ("logbook_id") REFERENCES "logbooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entries" ADD CONSTRAINT "FK_adf8b6d7eec55ae0b4762dca5d9" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entry_versions" ADD CONSTRAINT "FK_c164b1b86076d629ded905b405f" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entry_versions" ADD CONSTRAINT "FK_82c74f63185d5c839c9c35375c3" FOREIGN KEY ("saved_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pinned_entries" ADD CONSTRAINT "FK_a27e4cb4c70407bf5906796fb81" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pinned_entries" ADD CONSTRAINT "FK_c68f1e5b228c46dfb2f534cbc6a" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pinned_entries" DROP CONSTRAINT "FK_c68f1e5b228c46dfb2f534cbc6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pinned_entries" DROP CONSTRAINT "FK_a27e4cb4c70407bf5906796fb81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entry_versions" DROP CONSTRAINT "FK_82c74f63185d5c839c9c35375c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entry_versions" DROP CONSTRAINT "FK_c164b1b86076d629ded905b405f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbooks" DROP CONSTRAINT "FK_2c954bb3783da2277ec8fbd37be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entries" DROP CONSTRAINT "FK_adf8b6d7eec55ae0b4762dca5d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entries" DROP CONSTRAINT "FK_390e38925d684c2bef88e9fb18a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_identities" DROP CONSTRAINT "FK_bf5fe01eb8cad7114b4c371cdc7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbook_members" DROP CONSTRAINT "FK_46a9f68b634f0c8bcbad16e9066"`,
    );
    await queryRunner.query(
      `ALTER TABLE "logbook_members" DROP CONSTRAINT "FK_d53a3eb590f6e9147ac113bcf04"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_c68f1e5b228c46dfb2f534cbc6"`);
    await queryRunner.query(`DROP TABLE "pinned_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c164b1b86076d629ded905b405"`);
    await queryRunner.query(`DROP TABLE "entry_versions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_390e38925d684c2bef88e9fb18"`);
    await queryRunner.query(`DROP TABLE "entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2c954bb3783da2277ec8fbd37b"`);
    await queryRunner.query(`DROP TABLE "logbooks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_46a9f68b634f0c8bcbad16e906"`);
    await queryRunner.query(`DROP TABLE "logbook_members"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bf5fe01eb8cad7114b4c371cdc"`);
    await queryRunner.query(`DROP TABLE "user_identities"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
