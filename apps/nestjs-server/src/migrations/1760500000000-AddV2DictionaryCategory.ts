import { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2DictionaryCategory1760500000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_dictionary
			ADD COLUMN category varchar(100)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_dictionary
			DROP COLUMN category
		`);
	}
}
