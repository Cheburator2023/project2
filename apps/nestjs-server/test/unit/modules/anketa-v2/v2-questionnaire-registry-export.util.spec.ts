import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ExcelJS from "exceljs";
import type { V2QuestionnaireDto } from "@smart-anketa/api-contract";
import {
	buildRegistryExportColumnsFromSchemas,
	deriveRegistryColumnOptionsFromFormDataBatch,
	mergeDerivedRegistryColumnOptions,
	writeV2QuestionnaireRegistryXlsxFile,
} from "../../../../src/modules/anketa-v2/utils/v2-questionnaire-registry-export.util";

function dto(partial: Partial<V2QuestionnaireDto> & { id: string }): V2QuestionnaireDto {
	return {
		calcName: partial.calcName ?? partial.id,
		status: "active",
		version: "1",
		seriesId: "s1",
		parentQuestionnaireId: null,
		readableId: null,
		templateId: "t1",
		templateCode: "t",
		templateName: "T",
		boundTemplateVersionId: "v1",
		formData: {},
		finalCoefficient: null,
		author: "A",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		schemaBinding: {
			status: "aligned",
			boundTemplateVersionId: "v1",
			boundTemplateVersionNumber: 1,
			boundTemplateVersionStatus: "published",
			boundTemplateVersionCreatedAt: null,
			boundTemplateVersionUpdatedAt: null,
			currentTemplateVersionId: "v1",
			currentTemplateVersionNumber: 1,
			message: "",
		},
		workflowGlobalStatus: null,
		workflowSectionStatuses: {
			generalInfo: "Создано",
			detailInfo: "Создано",
			streamDataSources: "Создано",
			streamModelControl: "Создано",
		},
		...partial,
	};
}

describe("v2 questionnaire registry export util", () => {
	it("merges array indices from batches so page-sized scans still see later rows", () => {
		const first = deriveRegistryColumnOptionsFromFormDataBatch([
			{ detailInfo: { sourceSystems: [{ name: "a", type: "Внутренний" }] } },
		]);
		const second = deriveRegistryColumnOptionsFromFormDataBatch([
			{
				detailInfo: {
					sourceSystems: [
						{ name: "a", type: "Внутренний" },
						{ name: "b", type: "Внутренний" },
						{ name: "c", type: "Внутренний" },
					],
				},
			},
		]);
		const merged = mergeDerivedRegistryColumnOptions(first, second);
		expect(merged.arrayIndicesByPath?.["detailInfo.sourceSystems"]).toEqual([
			0, 1, 2,
		]);
	});

	it("streams rows to xlsx without collecting them into one array", async () => {
		const dir = await mkdtemp(join(tmpdir(), "v2-export-util-"));
		const filePath = join(dir, "out.xlsx");
		try {
			const columns = buildRegistryExportColumnsFromSchemas([], {});
			async function* rows() {
				yield dto({ id: "q1", calcName: "Первая" });
				yield dto({ id: "q2", calcName: "Вторая" });
			}
			const count = await writeV2QuestionnaireRegistryXlsxFile(
				filePath,
				columns,
				rows(),
			);
			expect(count).toBe(2);

			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(await readFile(filePath));
			const sheet = workbook.getWorksheet("Анкеты v2");
			expect(sheet).toBeDefined();
			const names: string[] = [];
			sheet!.eachRow((row, index) => {
				if (index === 1) return;
				const record = row.values as unknown[];
				const joined = record
					.filter((cell) => typeof cell === "string")
					.join(" ");
				if (joined.includes("Первая") || joined.includes("Вторая")) {
					names.push(joined);
				}
			});
			expect(names.some((line) => line.includes("Первая"))).toBe(true);
			expect(names.some((line) => line.includes("Вторая"))).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
