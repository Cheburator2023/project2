import { expect, test } from "@playwright/test";
import {
	apiRequest,
	createAnketaViaUi,
	createSchemaWithoutTypicalWorks,
	createTypicalWorkViaUi,
	openTypicalWorksPanel,
	saveAndActivateSchema,
	saveSchemaInPlace,
	templateIdFromEditorUrl,
	tid,
	waitForEditorReady,
} from "../helpers/ui";

/**
 * Полный UI-цикл:
 * 1) админка: схема без сида работ
 * 2) создать типовую работу (модельный стрим) + норматив + bind + save
 * 3) always-trigger через API (стабильно) + проверка в UI
 * 4) сохранить / сделать актуальной
 * 5) новая анкета (?templateId=) → calculate → сверка имени работы и часов
 */
test.describe.serial("admin typical works → new anketa", () => {
	const runId = Date.now();
	const schemaName = `E2E PW schema ${runId}`;
	const workName = `E2E PW work ${runId}`;
	const anketaName = `E2E PW anketa ${runId}`;
	const starterNorm = "4.5";
	const modelStream = "Модельный стрим";

	let templateId = "";
	let workId = "";
	let versionId = "";

	test("1. создать схему без типовых работ", async ({ page }) => {
		await createSchemaWithoutTypicalWorks(page, schemaName);
		templateId = templateIdFromEditorUrl(page.url());
		expect(templateId).toBeTruthy();
		await expect(page.locator(tid("headerMeta"))).toContainText(schemaName);
	});

	test("2. создать работу, открыть формулу, выставить always-trigger", async ({
		page,
		request,
	}) => {
		await page.goto(`/admin/templates/${templateId}/edit`);
		await waitForEditorReady(page);
		await createTypicalWorkViaUi(page, {
			name: workName,
			norm: starterNorm,
			streamLabel: modelStream,
			// Без экземпляров в форме total=0; modelService даёт контекст «Контекст»
			archComponentType: "Модельный сервис",
		});

		// Карточка и редактор формулы видны
		await expect(page.locator(tid("workFormulaEditor"))).toBeVisible({
			timeout: 60_000,
		});
		await expect(page.locator(tid("workFormulaRibbon"))).toBeVisible();

		const url = new URL(page.url());
		versionId = url.searchParams.get("versionId") ?? "";
		expect(versionId).toBeTruthy();

		// Важно: сохранить boundWorkIds до reload (иначе catalog rule останется condition:false)
		await saveSchemaInPlace(page);

		const works = (await apiRequest(
			request,
			"GET",
			`/v2/works?templateId=${templateId}`,
		)) as {
			items: Array<{
				id: string;
				name: string;
				streams?: string[];
				streamExecutor?: string;
			}>;
		};
		const created = works.items.find((w) => w.name === workName);
		expect(created).toBeTruthy();
		workId = created!.id;
		const streamExecutor =
			created!.streams?.[0] ??
			created!.streamExecutor ??
			modelStream;

		const version = (await apiRequest(
			request,
			"GET",
			`/v2/templates/${templateId}/versions/${versionId}`,
		)) as {
			logic?: { rules?: Array<{ id?: string; condition?: unknown; payload?: { allowedWorkIds?: string[] } }> };
			uiSchema?: unknown;
		};
		const catalogRule = version.logic?.rules?.find((r) =>
			String(r.id ?? "").includes("detailTypicalTasks"),
		);
		expect(catalogRule?.payload?.allowedWorkIds ?? []).toContain(workId);
		expect(catalogRule?.condition).not.toBe(false);

		const card = (await apiRequest(
			request,
			"GET",
			`/v2/works/${workId}?streamExecutor=${encodeURIComponent(streamExecutor)}&templateVersionId=${versionId}`,
		)) as {
			streamExecutor: string;
			formula?: { tokens?: unknown[] };
			rules?: unknown[];
		};

		await apiRequest(request, "PATCH", `/v2/works/${workId}`, {
			templateVersionId: versionId,
			streamExecutor: card.streamExecutor || streamExecutor,
			rules: [
				{
					streamExecutor: card.streamExecutor || streamExecutor,
					schemaFieldUid: null,
					paramCode: "__always__",
					paramName: "Нет — работа выводится всегда",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
			formula: card.formula ?? { tokens: [{ kind: "norm" }] },
		});

		await page.reload();
		await waitForEditorReady(page);
		await openTypicalWorksPanel(page);
		await page.getByText(workName, { exact: false }).first().click();
		await expect(page.locator(tid("workFormulaEditor"))).toBeVisible({
			timeout: 30_000,
		});
		await expect(
			page
				.getByText(/Работа появляется всегда, без проверки полей/i)
				.first(),
		).toBeVisible({ timeout: 30_000 });
	});

	test("3. сохранить схему и сделать актуальной", async ({ page }) => {
		await page.goto(
			`/admin/templates/${templateId}/edit?versionId=${versionId}`,
		);
		await waitForEditorReady(page);
		await saveAndActivateSchema(page);

		const templates = (await apiRequest(
			page.request,
			"GET",
			"/v2/templates",
		)) as Array<{ id: string; currentVersionId?: string | null }>;
		const current = templates.find((t) => t.id === templateId);
		expect(current?.currentVersionId).toBeTruthy();
	});

	test("4. новая анкета — работа в calculate с ожидаемыми часами", async ({
		page,
		request,
	}) => {
		await createAnketaViaUi(page, anketaName, { templateId });

		const calc = (await apiRequest(
			request,
			"POST",
			`/v2/templates/${templateId}/calculate`,
			{ formData: {} },
		)) as {
			formData?: {
				summary?: { typicalTotal?: number };
				detailInfo?: { detailTypicalTasks?: Array<{ name?: string; total?: number }> };
			};
		};

		const tasks = calc.formData?.detailInfo?.detailTypicalTasks ?? [];
		const matched = tasks.find((t) => t.name === workName);
		expect(matched).toBeTruthy();
		expect(matched?.total).toBeCloseTo(4.5, 5);
		expect(calc.formData?.summary?.typicalTotal).toBeCloseTo(4.5, 5);

		// Итоги в правой панели («Модельный стрим» / подробный расчёт)
		const workInUi = page.getByText(workName, { exact: false }).first();
		await expect(workInUi).toBeVisible({ timeout: 60_000 });
		await expect(page.getByText(/4([.,]5)0?/).first()).toBeVisible({
			timeout: 30_000,
		});
	});
});
