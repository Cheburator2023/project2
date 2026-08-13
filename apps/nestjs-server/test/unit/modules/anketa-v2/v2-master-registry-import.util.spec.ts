import {
	buildPlaceholderCalcName,
	deptAcronym,
	findBudgetCampaignColumn,
	lookupOverride,
	mapMasterRegistryRow,
	parseMasterRegistryRows,
	resolveDeptLabel,
	resolveStreamCode,
	softNormKey,
	suggestSimilarLabels,
	V2_MASTER_REGISTRY_COLS,
	V2_MASTER_REGISTRY_DATA_START,
	V2_MASTER_REGISTRY_HEADER_ROW,
} from "../../../../src/modules/anketa-v2/utils/v2-master-registry-import.util";

function emptyRow(): unknown[] {
	return Array.from({ length: 20 }, () => "");
}

describe("v2-master-registry-import.util", () => {
	it("maps stream labels to codes", () => {
		expect(resolveStreamCode("Моделирование РБ")).toBe("rb");
		expect(resolveStreamCode("Источники данных")).toBe("idsrc");
		expect(resolveStreamCode("неизвестный стрим")).toBeNull();
	});

	it("finds budget campaign column by header text", () => {
		const header = emptyRow();
		header[10] = "Бюджетная кампания";
		expect(findBudgetCampaignColumn(header)).toBe(10);
		expect(findBudgetCampaignColumn(emptyRow())).toBe(-1);
	});

	it("builds department acronyms and soft keys", () => {
		expect(deptAcronym("Департамент внутреннего аудита")).toBe("ДВА");
		expect(deptAcronym("Департамент анализа данных и моделирования")).toBe(
			"ДАДМ",
		);
		expect(softNormKey("комплаенс-контроля")).toBe(
			softNormKey("комплаенс контроля"),
		);
	});

	it("resolves department by soft hyphen match", () => {
		const label = "Департамент комплаенс-контроля и финансового мониторинга";
		const byKey = new Map([["департамент комплаенс-контроля и финансового мониторинга", label]]);
		const bySoft = new Map([[softNormKey(label), label]]);
		const keys = new Set([
			"департамент комплаенс-контроля и финансового мониторинга",
		]);
		expect(
			resolveDeptLabel(
				"Департамент комплаенс контроля и финансового мониторинга",
				byKey,
				keys,
				bySoft,
			),
		).toBe(label);
	});

	it("suggests similar departments for abbreviations", () => {
		const candidates = [
			"Департамент внутреннего аудита",
			"Департамент анализа данных и моделирования",
			"Департамент розничных кредитных рисков",
			"Административный департамент",
		];
		expect(suggestSimilarLabels("ДВА", candidates, 2)[0]).toBe(
			"Департамент внутреннего аудита",
		);
		expect(suggestSimilarLabels("ДАДМ", candidates, 2)[0]).toBe(
			"Департамент анализа данных и моделирования",
		);
	});

	it("maps only registry fields and ignores project", () => {
		const row = emptyRow();
		const cols = V2_MASTER_REGISTRY_COLS;
		row[cols.no] = "7";
		row[cols.initiative] = "Инициатива А";
		row[cols.department] = "Департамент Х";
		row[cols.customerFio] = "Иванов";
		row[cols.gbl] = "GBL1";
		row[cols.name] = "Задача 7";
		row[cols.taskDescription] = "Описание";
		row[cols.production] = "3";
		row[cols.stream] = "Моделирование РБ";
		row[3] = "Проект из файла";

		const result = mapMasterRegistryRow(row, {
			masterRow1Based: 5,
			budgetCol: -1,
			deptByKey: new Map([["департамент х", "Департамент Х"]]),
			deptBySoftKey: new Map([["департамент х", "Департамент Х"]]),
			schemaDeptKeys: new Set(["департамент х"]),
			schemaDeptLabels: ["Департамент Х"],
			allowedProd: new Set(["Не требуется", "3"]),
		});

		expect(result).not.toBeNull();
		expect(result!.row.calcName).toBe("Задача 7");
		expect(result!.row.formData.meta.name).toBe("Задача 7");
		expect(result!.row.formData.generalInfo).toEqual({
			initiative: "Инициатива А",
			businessCustomer: ["Департамент Х"],
			implementationStream: "rb",
			field_vz9bm7A3: "Иванов",
			gbl: "GBL1",
			taskDescription: "Описание",
			productionAdditionalReports: "3",
		});
		expect(result!.row.formData.generalInfo).not.toHaveProperty("project");
	});

	it("attaches suggestions for unmatched department", () => {
		const row = emptyRow();
		row[V2_MASTER_REGISTRY_COLS.department] = "ДВА";
		row[V2_MASTER_REGISTRY_COLS.name] = "Задача";
		const result = mapMasterRegistryRow(row, {
			masterRow1Based: 5,
			budgetCol: -1,
			deptByKey: new Map(),
			deptBySoftKey: new Map(),
			schemaDeptKeys: new Set(),
			schemaDeptLabels: ["Департамент внутреннего аудита"],
			allowedProd: new Set(["Не требуется"]),
		});
		expect(result!.row.issues[0]?.code).toBe("dept_unmatched");
		expect(result!.row.issues[0]?.suggestions?.[0]).toBe(
			"Департамент внутреннего аудита",
		);
	});

	it("generates placeholder name when Excel name is empty", () => {
		const stub = buildPlaceholderCalcName({
			masterRow: 10,
			masterNo: "3",
			nonce: "fixed",
		});
		expect(stub).toMatch(/^Анкета без названия — \d{4}-\d{2}-\d{2} — [0-9a-f]{8}$/);

		const row = emptyRow();
		row[V2_MASTER_REGISTRY_COLS.initiative] = "Иниц";
		const result = mapMasterRegistryRow(row, {
			masterRow1Based: 10,
			budgetCol: -1,
			deptByKey: new Map(),
			deptBySoftKey: new Map(),
			schemaDeptKeys: new Set(),
			schemaDeptLabels: [],
			allowedProd: new Set(["Не требуется"]),
		});
		expect(result!.row.calcName).toMatch(/^Анкета без названия — /);
		expect(result!.row.formData.meta.name).toBe(result!.row.calcName);
		const missing = result!.row.issues.find((i) => i.code === "name_missing");
		expect(missing).toBeTruthy();
		expect(missing?.suggestions).toBeUndefined();
		expect(missing?.value).toBe("(пусто в Excel)");
	});

	it("strict matching ignores soft hyphen and abbreviations", () => {
		const label = "Департамент комплаенс-контроля и финансового мониторинга";
		const byKey = new Map([
			["департамент комплаенс-контроля и финансового мониторинга", label],
		]);
		const bySoft = new Map([[softNormKey(label), label]]);
		const keys = new Set([
			"департамент комплаенс-контроля и финансового мониторинга",
		]);

		expect(
			resolveDeptLabel(
				"Департамент комплаенс контроля и финансового мониторинга",
				byKey,
				keys,
				bySoft,
			),
		).toBe(label);
		expect(
			resolveDeptLabel(
				"Департамент комплаенс контроля и финансового мониторинга",
				byKey,
				keys,
				undefined,
			),
		).toBeNull();

		expect(resolveStreamCode("дадм", "fuzzy")).toBe("dadm");
		expect(resolveStreamCode("дадм", "exact")).toBeNull();
		expect(resolveStreamCode("Стрим ДАДМ", "exact")).toBe("dadm");

		const row = emptyRow();
		row[V2_MASTER_REGISTRY_COLS.department] = "ДФУ";
		row[V2_MASTER_REGISTRY_COLS.name] = "Задача";
		row[V2_MASTER_REGISTRY_COLS.stream] = "дадм";
		const strict = mapMasterRegistryRow(row, {
			masterRow1Based: 5,
			budgetCol: -1,
			deptByKey: new Map([
				[
					"департамент финансового урегулирования",
					"Департамент финансового урегулирования",
				],
			]),
			deptBySoftKey: new Map(),
			schemaDeptKeys: new Set(["департамент финансового урегулирования"]),
			schemaDeptLabels: ["Департамент финансового урегулирования"],
			allowedProd: new Set(["Не требуется"]),
			strictMatching: true,
		});
		expect(strict!.row.formData.generalInfo.businessCustomer).toBeUndefined();
		expect(strict!.row.formData.generalInfo.implementationStream).toBeUndefined();
		expect(strict!.row.issues.some((i) => i.code === "dept_unmatched")).toBe(
			true,
		);
		expect(strict!.row.issues.some((i) => i.code === "stream_unmatched")).toBe(
			true,
		);
		/** В strict suggestions не считаем — анкета всё равно создаётся с пустыми полями. */
		expect(
			strict!.row.issues.find((i) => i.code === "dept_unmatched")?.suggestions,
		).toBeUndefined();
	});

	it("applies department override from dry-run mapping", () => {
		expect(
			lookupOverride("ДФУ", {
				ДФУ: "Департамент финансового урегулирования",
			}),
		).toBe("Департамент финансового урегулирования");

		const row = emptyRow();
		row[V2_MASTER_REGISTRY_COLS.department] = "ДФУ";
		row[V2_MASTER_REGISTRY_COLS.name] = "Задача";
		const label = "Департамент финансового урегулирования";
		const result = mapMasterRegistryRow(row, {
			masterRow1Based: 5,
			budgetCol: -1,
			deptByKey: new Map([["департамент финансового урегулирования", label]]),
			deptBySoftKey: new Map([["департамент финансового урегулирования", label]]),
			schemaDeptKeys: new Set(["департамент финансового урегулирования"]),
			schemaDeptLabels: [label],
			allowedProd: new Set(["Не требуется"]),
			overrides: { departments: { ДФУ: label } },
		});
		expect(result!.row.formData.generalInfo.businessCustomer).toEqual([label]);
		expect(result!.row.issues.some((i) => i.code === "dept_unmatched")).toBe(
			false,
		);
	});

	it("parses matrix with header/data offsets", () => {
		const rows: unknown[][] = [];
		for (let i = 0; i < V2_MASTER_REGISTRY_DATA_START; i += 1) {
			rows.push(emptyRow());
		}
		const header = emptyRow();
		header[1] = "Инициатива";
		header[11] = "Бюджетная кампания";
		rows[V2_MASTER_REGISTRY_HEADER_ROW] = header;

		const data = emptyRow();
		data[V2_MASTER_REGISTRY_COLS.name] = "Задача";
		data[V2_MASTER_REGISTRY_COLS.initiative] = "Иниц";
		data[11] = "2026";
		rows.push(data);

		const parsed = parseMasterRegistryRows(rows, {
			schemaDeptLabels: [],
		});
		expect(parsed.budgetCampaignColumn).toBe(11);
		expect(parsed.stats.rowsReady).toBe(1);
		expect(parsed.rows[0]?.formData.generalInfo.budgetCampaign).toBe("2026");
	});
});
