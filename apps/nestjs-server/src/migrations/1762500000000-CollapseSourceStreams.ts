import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Схлопывает legacy-стримы источников «ИД. Внутренний» / «ИД. Внешний» в единый
 * стрим «Источники данных» по всем таблицам типовых работ.
 *
 * Политика реконсиляции при коллизии уникальных индексов — детерминированная:
 * приоритет «Источники данных» (уже канонический) > «ИД. Внутренний» > «ИД. Внешний».
 * То есть внутренний побеждает внешний, при этом нормы/формулы внешнего стрима,
 * дублирующие внутренний, удаляются.
 *
 * Необратимо: down() — no-op, восстановить исходное разделение без потери данных нельзя.
 */
export class CollapseSourceStreams1762500000000 implements MigrationInterface {
	name = "CollapseSourceStreams1762500000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		// --- assignment: uq (work_id, stream_executor) ---------------------------
		// Слияние активности: работа активна, если активна хотя бы одна её строка.
		await queryRunner.query(`
			UPDATE v2_typical_work_assignment a
			SET is_active = true
			WHERE a.stream_executor IN ('ИД. Внутренний', 'ИД. Внешний', 'Источники данных')
			  AND EXISTS (
				SELECT 1 FROM v2_typical_work_assignment o
				WHERE o.work_id = a.work_id
				  AND o.stream_executor IN ('ИД. Внутренний', 'ИД. Внешний', 'Источники данных')
				  AND o.is_active = true
			)
		`);
		await queryRunner.query(`
			DELETE FROM v2_typical_work_assignment t
			USING (
				SELECT id, row_number() OVER (
					PARTITION BY work_id
					ORDER BY CASE stream_executor
						WHEN 'Источники данных' THEN 0
						WHEN 'ИД. Внутренний' THEN 1
						WHEN 'ИД. Внешний' THEN 2
						ELSE 3 END
				) AS rn
				FROM v2_typical_work_assignment
				WHERE stream_executor IN ('Источники данных', 'ИД. Внутренний', 'ИД. Внешний')
			) d
			WHERE t.id = d.id AND d.rn > 1
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_assignment
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);

		// --- norm: без уникального индекса ---------------------------------------
		// Внутренний побеждает: если есть внутренние нормы — внешние удаляем.
		await queryRunner.query(`
			DELETE FROM v2_typical_work_norm e
			WHERE e.stream_executor = 'ИД. Внешний'
			  AND EXISTS (
				SELECT 1 FROM v2_typical_work_norm i
				WHERE i.work_id = e.work_id AND i.stream_executor = 'ИД. Внутренний'
			)
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_norm
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);

		// --- rule: без уникального индекса ---------------------------------------
		// Убрать противоречивые триггеры типа источника (артефакт маршрутизации):
		// если у работы по одному параметру есть и «Внутренний», и «Внешний» — удалить оба.
		await queryRunner.query(`
			DELETE FROM v2_typical_work_rule r
			WHERE r.stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
			  AND lower(coalesce(r.value_label, '')) IN ('внутренний', 'внешний')
			  AND EXISTS (
				SELECT 1 FROM v2_typical_work_rule r2
				WHERE r2.work_id = r.work_id
				  AND r2.param_code = r.param_code
				  AND lower(coalesce(r2.value_label, '')) IN ('внутренний', 'внешний')
				  AND lower(coalesce(r2.value_label, '')) <> lower(coalesce(r.value_label, ''))
			)
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_rule
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);
		await queryRunner.query(`
			DELETE FROM v2_typical_work_rule t
			USING (
				SELECT id, row_number() OVER (
					PARTITION BY work_id, stream_executor, param_code, operator,
						coalesce(value_code, ''), coalesce(value_label, '')
					ORDER BY created_at, id
				) AS rn
				FROM v2_typical_work_rule
				WHERE stream_executor = 'Источники данных'
			) d
			WHERE t.id = d.id AND d.rn > 1
		`);

		// --- labor_coefficient: uq (work_id, stream, param_code, value_code) -----
		// NULL value_code уникальности не нарушает (Postgres) — дедуп только для NOT NULL.
		await queryRunner.query(`
			DELETE FROM v2_typical_work_labor_coefficient t
			USING (
				SELECT id, row_number() OVER (
					PARTITION BY work_id, param_code, value_code
					ORDER BY CASE stream_executor
						WHEN 'Источники данных' THEN 0
						WHEN 'ИД. Внутренний' THEN 1
						WHEN 'ИД. Внешний' THEN 2
						ELSE 3 END
				) AS rn
				FROM v2_typical_work_labor_coefficient
				WHERE stream_executor IN ('Источники данных', 'ИД. Внутренний', 'ИД. Внешний')
				  AND value_code IS NOT NULL
			) d
			WHERE t.id = d.id AND d.rn > 1
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_labor_coefficient
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);

		// --- labor_param: uq (work_id, stream, param_code) -----------------------
		await queryRunner.query(`
			DELETE FROM v2_typical_work_labor_param t
			USING (
				SELECT id, row_number() OVER (
					PARTITION BY work_id, param_code
					ORDER BY CASE stream_executor
						WHEN 'Источники данных' THEN 0
						WHEN 'ИД. Внутренний' THEN 1
						WHEN 'ИД. Внешний' THEN 2
						ELSE 3 END
				) AS rn
				FROM v2_typical_work_labor_param
				WHERE stream_executor IN ('Источники данных', 'ИД. Внутренний', 'ИД. Внешний')
			) d
			WHERE t.id = d.id AND d.rn > 1
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_labor_param
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);

		// --- version_config: uq (template_version_id, work_id, stream) -----------
		await queryRunner.query(`
			DELETE FROM v2_typical_work_version_config t
			USING (
				SELECT id, row_number() OVER (
					PARTITION BY template_version_id, work_id
					ORDER BY CASE stream_executor
						WHEN 'Источники данных' THEN 0
						WHEN 'ИД. Внутренний' THEN 1
						WHEN 'ИД. Внешний' THEN 2
						ELSE 3 END
				) AS rn
				FROM v2_typical_work_version_config
				WHERE stream_executor IN ('Источники данных', 'ИД. Внутренний', 'ИД. Внешний')
			) d
			WHERE t.id = d.id AND d.rn > 1
		`);
		await queryRunner.query(`
			UPDATE v2_typical_work_version_config
			SET stream_executor = 'Источники данных'
			WHERE stream_executor IN ('ИД. Внутренний', 'ИД. Внешний')
		`);
	}

	public async down(): Promise<void> {
		// Необратимо: слияние стримов «ИД. Внутренний»/«ИД. Внешний» → «Источники данных»
		// нельзя откатить без потери исходного разделения данных.
	}
}
