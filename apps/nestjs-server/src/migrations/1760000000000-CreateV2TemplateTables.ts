import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2TemplateTables1760000000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TYPE v2_template_status_enum AS ENUM ('draft', 'published', 'archived')
		`);

		await queryRunner.query(`
			CREATE TYPE v2_template_audit_action_enum AS ENUM (
				'template.created',
				'template.updated',
				'template.deleted',
				'version.created',
				'version.updated',
				'version.published',
				'version.archived',
				'version.rolled_back',
				'version.deleted',
				'version.reset_to_default',
				'version.activated_as_current',
				'dictionary.created',
				'dictionary.updated',
				'dictionary.deleted',
				'dictionary_item.created',
				'dictionary_item.updated',
				'dictionary_item.deleted'
			)
		`);

		await queryRunner.query(`
			CREATE TABLE v2_template (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				code varchar(100) NOT NULL UNIQUE,
				name varchar(255) NOT NULL,
				description text,
				stream_code varchar(100),
				current_version_id uuid,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				created_by varchar(255),
				updated_by varchar(255)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE v2_template_version (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				template_id uuid NOT NULL,
				version_number integer NOT NULL,
				status v2_template_status_enum NOT NULL DEFAULT 'draft',
				json_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
				ui_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
				logic jsonb NOT NULL DEFAULT '{"rules":[]}'::jsonb,
				dictionaries_snapshot jsonb,
				release_notes text,
				parent_version_id uuid,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				published_at timestamptz,
				created_by varchar(255),
				CONSTRAINT uq_v2_template_version_number UNIQUE (template_id, version_number)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE v2_template_audit (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				template_id uuid NOT NULL,
				version_id uuid,
				action v2_template_audit_action_enum NOT NULL,
				payload jsonb,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				created_by varchar(255)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE v2_dictionary (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				code varchar(100) NOT NULL UNIQUE,
				name varchar(255) NOT NULL,
				description text,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await queryRunner.query(`
			CREATE TABLE v2_dictionary_item (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				dictionary_id uuid NOT NULL,
				code varchar(100) NOT NULL,
				label varchar(500) NOT NULL,
				parent_code varchar(100),
				"order" integer NOT NULL DEFAULT 0,
				is_active boolean NOT NULL DEFAULT true,
				payload jsonb,
				CONSTRAINT uq_v2_dictionary_item_code UNIQUE (dictionary_id, code)
			)
		`);

		await queryRunner.query(`
			ALTER TABLE v2_template
			ADD CONSTRAINT fk_v2_template_current_version
			FOREIGN KEY (current_version_id) REFERENCES v2_template_version(id)
			ON DELETE SET NULL
		`);

		await queryRunner.query(`
			ALTER TABLE v2_template_version
			ADD CONSTRAINT fk_v2_template_version_template
			FOREIGN KEY (template_id) REFERENCES v2_template(id)
			ON DELETE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE v2_template_version
			ADD CONSTRAINT fk_v2_template_version_parent
			FOREIGN KEY (parent_version_id) REFERENCES v2_template_version(id)
			ON DELETE SET NULL
		`);

		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ADD CONSTRAINT fk_v2_template_audit_template
			FOREIGN KEY (template_id) REFERENCES v2_template(id)
			ON DELETE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ADD CONSTRAINT fk_v2_template_audit_version
			FOREIGN KEY (version_id) REFERENCES v2_template_version(id)
			ON DELETE SET NULL
		`);

		await queryRunner.query(`
			ALTER TABLE v2_dictionary_item
			ADD CONSTRAINT fk_v2_dictionary_item_dictionary
			FOREIGN KEY (dictionary_id) REFERENCES v2_dictionary(id)
			ON DELETE CASCADE
		`);

		await queryRunner.query(`CREATE INDEX idx_v2_template_code ON v2_template(code)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_stream_code ON v2_template(stream_code)`);

		await queryRunner.query(`CREATE INDEX idx_v2_template_version_template_id ON v2_template_version(template_id)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_version_status ON v2_template_version(status)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_version_parent_version_id ON v2_template_version(parent_version_id)`);

		await queryRunner.query(`CREATE INDEX idx_v2_template_audit_template_id ON v2_template_audit(template_id)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_audit_version_id ON v2_template_audit(version_id)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_audit_action ON v2_template_audit(action)`);
		await queryRunner.query(`CREATE INDEX idx_v2_template_audit_created_at ON v2_template_audit(created_at)`);

		await queryRunner.query(`CREATE INDEX idx_v2_dictionary_code ON v2_dictionary(code)`);

		await queryRunner.query(`CREATE INDEX idx_v2_dictionary_item_dictionary_id ON v2_dictionary_item(dictionary_id)`);
		await queryRunner.query(`CREATE INDEX idx_v2_dictionary_item_parent_code ON v2_dictionary_item(parent_code)`);
		await queryRunner.query(`CREATE INDEX idx_v2_dictionary_item_is_active ON v2_dictionary_item(is_active)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_dictionary_item_is_active`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_dictionary_item_parent_code`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_dictionary_item_dictionary_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_dictionary_code`);

		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_audit_created_at`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_audit_action`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_audit_version_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_audit_template_id`);

		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_version_parent_version_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_version_status`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_version_template_id`);

		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_stream_code`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_v2_template_code`);

		await queryRunner.query(`ALTER TABLE v2_dictionary_item DROP CONSTRAINT IF EXISTS fk_v2_dictionary_item_dictionary`);
		await queryRunner.query(`ALTER TABLE v2_template_audit DROP CONSTRAINT IF EXISTS fk_v2_template_audit_version`);
		await queryRunner.query(`ALTER TABLE v2_template_audit DROP CONSTRAINT IF EXISTS fk_v2_template_audit_template`);
		await queryRunner.query(`ALTER TABLE v2_template_version DROP CONSTRAINT IF EXISTS fk_v2_template_version_parent`);
		await queryRunner.query(`ALTER TABLE v2_template_version DROP CONSTRAINT IF EXISTS fk_v2_template_version_template`);
		await queryRunner.query(`ALTER TABLE v2_template DROP CONSTRAINT IF EXISTS fk_v2_template_current_version`);

		await queryRunner.query(`DROP TABLE IF EXISTS v2_dictionary_item`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_dictionary`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_template_audit`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_template_version`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_template`);

		await queryRunner.query(`DROP TYPE IF EXISTS v2_template_audit_action_enum`);
		await queryRunner.query(`DROP TYPE IF EXISTS v2_template_status_enum`);
	}
}
