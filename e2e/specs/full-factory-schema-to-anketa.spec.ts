import { expect, test } from "@playwright/test";
import {
	assertTypicalRowMath,
	collectTypicalWorkRowsFromFormData,
	sumTypicalTotals,
} from "../helpers/calculate";
import {
	activateTemplateVersionViaApi,
	apiRequest,
	createAnketaViaUi,
	createFullFactorySchema,
	FACTORY_ANKETA_SEED_FORM_DATA,
	FACTORY_TYPICAL_WORKS_MIN_COUNT,
	fetchTypicalWorkCard,
	fillFactoryAnketaSeedViaUi,
	listTemplateTypicalWorks,
	mapPool,
	openTypicalWorksPanel,
	previewTypicalWork,
	saveAndActivateSchema,
	templateIdFromEditorUrl,
	tid,
	waitForEditorReady,
	waitForFactoryTypicalWorks,
} from "../helpers/ui";

/**
 * Полная заводская схема (со всеми типовыми работами) → активация →
 * новая анкета с заполненными арх. экземплярами → сверка параметров/формул
 * (API preview + calculate) и UI.
 */
test.describe.serial("full factory schema → anketa calculations", () => {
	test.describe.configure({ timeout: 20 * 60_000 });

	const runId = Date.now();
	const schemaName = `E2E PW factory ${runId}`;
	const anketaName = `E2E PW factory anketa ${runId}`;

	let templateId = "";
	let versionId = "";
	let workCount = 0;

	test("1. создать полную заводскую схему и дождаться сида работ", async ({
		page,
		request,
	}) => {
		await createFullFactorySchema(page, schemaName);
		templateId = templateIdFromEditorUrl(page.url());
		expect(templateId).toBeTruthy();

		workCount = await waitForFactoryTypicalWorks(request, templateId);
		expect(workCount).toBeGreaterThanOrEqual(FACTORY_TYPICAL_WORKS_MIN_COUNT);

		const url = new URL(page.url());
		versionId = url.searchParams.get("versionId") ?? "";
		if (!versionId) {
			const versions = (await apiRequest(
				request,
				"GET",
				`/v2/templates/${templateId}/versions`,
			)) as Array<{ id: string; status: string }>;
			versionId =
				versions.find((v) => v.status === "draft")?.id ??
				versions[0]?.id ??
				"";
		}
		expect(versionId).toBeTruthy();
		await expect(page.locator(tid("headerMeta"))).toContainText(schemaName);
	});

	test("2. в админке: список работ и карточки (формула / норма / параметры)", async ({
		page,
		request,
	}) => {
		await page.goto(
			`/admin/templates/${templateId}/edit?versionId=${versionId}`,
		);
		await waitForEditorReady(page);
		await openTypicalWorksPanel(page);

		const items = await listTemplateTypicalWorks(request, templateId);
		expect(items.length).toBeGreaterThanOrEqual(FACTORY_TYPICAL_WORKS_MIN_COUNT);

		// UI показывает хотя бы часть имён
		const sampleNames = items.slice(0, 5).map((w) => w.name);
		for (const name of sampleNames) {
			await expect(
				page.getByText(name, { exact: false }).first(),
			).toBeVisible({ timeout: 60_000 });
		}

		const cards = await mapPool(items, 6, async (item) => {
			const stream =
				item.streams?.[0] ?? item.streamExecutor ?? "Модельный стрим";
			const card = await fetchTypicalWorkCard(
				request,
				item.id,
				stream,
				versionId,
			);
			const tokens = card.formula?.tokens ?? [];
			expect(
				tokens.length > 0 || Boolean(card.formula?.text?.trim()),
				`У работы «${item.name}» пустая формула`,
			).toBeTruthy();

			const streamNorm = (card.norms ?? []).find(
				(n) => n.streamExecutor === stream || !n.streamExecutor,
			);
			expect(
				streamNorm != null && Number.isFinite(Number(streamNorm.normValue)),
				`У работы «${item.name}» нет нормы на стрим «${stream}»`,
			).toBeTruthy();

			return { item, stream, card, norm: Number(streamNorm!.normValue) };
		});

		// Preview: формула при пустых ответах должна дать конечный результат (обычно N)
		const previewIssues: string[] = [];
		await mapPool(cards, 4, async ({ item, stream, norm }) => {
			const preview = await previewTypicalWork(request, item.id, stream, {});
			if (preview.error && preview.result == null) {
				// Нет нормы на дату / битая формула — фиксируем, не валим весь прогон сразу
				previewIssues.push(`${item.name}: ${preview.error}`);
				return;
			}
			expect(
				preview.result,
				`Preview «${item.name}» вернул null без error`,
			).not.toBeNull();
			if (preview.result != null && Number.isFinite(norm) && norm > 0) {
				// При пустых answers by_value часто ×1 → result ≈ norm
				expect(
					preview.result,
					`Preview «${item.name}»: result=${preview.result}, norm=${norm}`,
				).toBeGreaterThanOrEqual(0);
			}
		});

		// Не больше 5% работ с ошибкой preview — иначе схема сломана
		expect(previewIssues.length / cards.length).toBeLessThan(0.05);
	});

	test("3. сохранить и сделать схему актуальной", async ({ page, request }) => {
		await page.goto(
			`/admin/templates/${templateId}/edit?versionId=${versionId}`,
		);
		await waitForEditorReady(page);
		await saveAndActivateSchema(page);

		let currentVersionId: string | null | undefined;
		await expect
			.poll(
				async () => {
					const templates = (await apiRequest(
						request,
						"GET",
						"/v2/templates",
					)) as Array<{ id: string; currentVersionId?: string | null }>;
					currentVersionId = templates.find(
						(t) => t.id === templateId,
					)?.currentVersionId;
					if (!currentVersionId) {
						await activateTemplateVersionViaApi(
							request,
							templateId,
							versionId,
						).catch(() => undefined);
					}
					return currentVersionId ?? null;
				},
				{ timeout: 120_000 },
			)
			.toBeTruthy();
		versionId = currentVersionId!;
	});

	test("4. новая анкета: calculate ↔ UI (нормы, коэффициенты, итоги)", async ({
		page,
		request,
	}) => {
		await createAnketaViaUi(page, anketaName, { templateId });

		// Эталонный расчёт с заполненными арх. экземплярами
		const calc = (await apiRequest(
			request,
			"POST",
			`/v2/templates/${templateId}/calculate`,
			{ formData: FACTORY_ANKETA_SEED_FORM_DATA },
		)) as {
			formData?: Record<string, unknown>;
		};

		const rows = collectTypicalWorkRowsFromFormData(calc.formData ?? {});
		expect(
			rows.length,
			"calculate должен вернуть хотя бы часть типовых работ",
		).toBeGreaterThan(0);

		const nonzero = rows.filter(
			(r) => r.total != null && r.total > 0 && r.name.trim(),
		);
		expect(
			nonzero.length,
			"при заполненных арх. экземплярах должны быть ненулевые итоги",
		).toBeGreaterThan(0);

		const mathErrors: string[] = [];
		for (const row of rows) {
			try {
				assertTypicalRowMath(row);
			} catch (e) {
				mathErrors.push(e instanceof Error ? e.message : String(e));
			}
		}
		expect(
			mathErrors,
			`Ошибки арифметики строк calculate:\n${mathErrors.join("\n")}`,
		).toEqual([]);

		const typicalTotal = asFinite(
			(calc.formData?.summary as { typicalTotal?: unknown } | undefined)
				?.typicalTotal,
		);
		const rowsSum = sumTypicalTotals(rows);
		if (typicalTotal != null) {
			expect(Math.abs(typicalTotal - rowsSum)).toBeLessThan(1);
			expect(typicalTotal).toBeGreaterThan(0);
		}

		// Карточки: норма в calculate ≈ норма работы (все ненулевые строки)
		const items = await listTemplateTypicalWorks(request, templateId);
		expect(items.length).toBeGreaterThanOrEqual(FACTORY_TYPICAL_WORKS_MIN_COUNT);
		const streamById = new Map(
			items.map((w) => [
				w.id,
				w.streams?.[0] ?? w.streamExecutor ?? "Модельный стрим",
			]),
		);
		const withIds = nonzero.filter((r) => r.workId);
		const normMismatches: string[] = [];
		await mapPool(withIds, 6, async (row) => {
			const stream = streamById.get(row.workId!) ?? "Модельный стрим";
			const card = await fetchTypicalWorkCard(
				request,
				row.workId!,
				stream,
				versionId,
			);
			const norm = (card.norms ?? []).find(
				(n) => n.streamExecutor === stream || !n.streamExecutor,
			)?.normValue;
			if (norm == null || row.estimateHoursPerDay == null) return;
			if (Math.abs(Number(norm) - row.estimateHoursPerDay) > 0.05) {
				normMismatches.push(
					`${row.name}: card.norm=${norm} calc.estimate=${row.estimateHoursPerDay}`,
				);
			}
		});
		expect(normMismatches, normMismatches.join("\n")).toEqual([]);

		// UI: заполнить те же арх. экземпляры → пересчёт в анкете
		const uiCalc = await fillFactoryAnketaSeedViaUi(page);
		const uiRows = collectTypicalWorkRowsFromFormData(uiCalc.formData);
		const uiNonzero = uiRows.filter(
			(r) => r.total != null && r.total > 0 && r.name.trim(),
		);
		expect(
			uiNonzero.length,
			"после заполнения UI calculate должен дать ненулевые типовые работы",
		).toBeGreaterThan(0);

		const uiMathErrors: string[] = [];
		for (const row of uiRows) {
			try {
				assertTypicalRowMath(row);
			} catch (e) {
				uiMathErrors.push(e instanceof Error ? e.message : String(e));
			}
		}
		expect(
			uiMathErrors,
			`Ошибки арифметики UI calculate:\n${uiMathErrors.join("\n")}`,
		).toEqual([]);

		const uiTypicalTotal = asFinite(
			(uiCalc.formData.summary as { typicalTotal?: unknown } | undefined)
				?.typicalTotal,
		);
		expect(uiTypicalTotal ?? 0).toBeGreaterThan(0);

		await page.getByRole("button", { name: /Диагностика расчёта/i }).click();
		const debug = page.locator(tid("v2-calculation-debug-dialog"));
		await debug.waitFor({ state: "visible", timeout: 30_000 });
		await debug.getByRole("tab", { name: /Вклад типовых работ/i }).click();

		// Список длинный — скроллим к каждой работе из UI calculate
		for (const row of uiNonzero) {
			const label = debug.getByText(row.name, { exact: false }).first();
			await label.scrollIntoViewIfNeeded();
			await expect(label).toBeVisible({ timeout: 15_000 });
		}

		await debug.getByRole("tab", { name: /Как получился итог/i }).click();
		const summaryTabText = await debug.innerText();
		expect(
			summaryTabText,
			"в диагностике должен быть ненулевой вклад типовых",
		).toMatch(/Типовые работы[\s\S]{0,120}[1-9]\d*/);

		await debug.getByRole("button", { name: /Закрыть/i }).first().click();

		// Правая панель / таблицы типовых работ (первые 10)
		for (const row of uiNonzero.slice(0, 10)) {
			const label = page.getByText(row.name, { exact: false }).first();
			await label.scrollIntoViewIfNeeded();
			await expect(label).toBeVisible({ timeout: 20_000 });
		}
	});
});

function asFinite(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value.replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	return null;
}
