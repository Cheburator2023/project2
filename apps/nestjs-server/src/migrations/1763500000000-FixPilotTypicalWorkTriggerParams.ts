import { MigrationInterface, QueryRunner } from "typeorm";

const PILOT_PARAM_CODE = "тип_пилота_разовой_загрузки";
const PILOT_PARAM_NAME = "Тип пилота / разовой загрузки";

/**
 * Исправляет legacy-разбиение «Пилот (первичный, повторный)» на битые paramCode
 * `пилот_первичный` + `повторный` после ошибочного CSV split.
 */
export class FixPilotTypicalWorkTriggerParams1763500000000
	implements MigrationInterface
{
	name = "FixPilotTypicalWorkTriggerParams1763500000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE v2_typical_work_rule
			SET param_code = '${PILOT_PARAM_CODE}',
			    param_name = '${PILOT_PARAM_NAME}'
			WHERE param_code = 'пилот_первичный'
			   OR param_name LIKE '%Пилот (первичный%'
		`);

		await queryRunner.query(`
			DELETE FROM v2_typical_work_rule
			WHERE param_code = 'повторный'
			   OR param_name LIKE 'повторный)%'
		`);

		await queryRunner.query(`
			UPDATE v2_typical_work_labor_coefficient
			SET param_code = '${PILOT_PARAM_CODE}',
			    param_name = '${PILOT_PARAM_NAME}'
			WHERE param_code = 'пилот_первичный'
			   OR param_name LIKE '%Пилот (первичный%'
			   OR param_name LIKE '? Пилот (первичный%'
		`);

		await queryRunner.query(`
			DELETE FROM v2_typical_work_labor_coefficient
			WHERE param_code = 'повторный'
			   OR param_name LIKE 'повторный)%'
		`);

		await queryRunner.query(`
			UPDATE v2_typical_work_labor_param
			SET param_code = '${PILOT_PARAM_CODE}',
			    param_name = '${PILOT_PARAM_NAME}'
			WHERE param_code = 'пилот_первичный'
			   OR param_name LIKE '%Пилот (первичный%'
			   OR param_name LIKE '? Пилот (первичный%'
		`);

		await queryRunner.query(`
			DELETE FROM v2_typical_work_labor_param
			WHERE param_code = 'повторный'
			   OR param_name LIKE 'повторный)%'
		`);
	}

	public async down(_queryRunner: QueryRunner): Promise<void> {
		// Необратимо: исходное битое разбиение не восстанавливаем.
	}
}
