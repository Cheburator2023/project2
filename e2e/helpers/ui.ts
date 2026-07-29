import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";
export const GOD_MODE_TOKEN = "god-mode-token";

export function tid(id: string) {
	return `[data-test-id="${id}"]`;
}

export async function apiRequest(
	request: APIRequestContext,
	method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
	path: string,
	data?: unknown,
) {
	const response = await request.fetch(`${API_BASE_URL}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${GOD_MODE_TOKEN}`,
			"Content-Type": "application/json",
		},
		data: data === undefined ? undefined : JSON.stringify(data),
	});
	const text = await response.text();
	let body: unknown = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = text;
	}
	if (!response.ok()) {
		throw new Error(
			`${method} ${path} → ${response.status()}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
		);
	}
	return body;
}

export async function waitForEditorReady(page: Page) {
	await page.locator(tid("schemaEditor")).waitFor({ state: "visible" });
	await page.locator(tid("headerActions")).waitFor({ state: "visible" });
}

/** Открыть панель «Логика» → вкладка «Типовые работы». */
export async function openTypicalWorksPanel(page: Page) {
	const panel = page.locator(tid("typicalWorksPanel"));
	if (await panel.isVisible().catch(() => false)) return;

	// Вкладки dock / сегмент «Типовые работы»
	const logicTab = page.getByRole("tab", { name: /^Логика$/ });
	if (await logicTab.isVisible().catch(() => false)) {
		await logicTab.click();
	} else {
		await page.locator(tid("dockPanelMenu")).click();
		await page.locator(tid("dockPanelMenuItem-logic")).click();
	}

	const worksSeg = page.getByRole("button", { name: "Типовые работы" });
	if (await worksSeg.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await worksSeg.click();
	}
	await page.locator(tid("typicalWorksPanel")).waitFor({ state: "visible" });
}

export async function createSchemaWithoutTypicalWorks(
	page: Page,
	name: string,
) {
	await page.goto("/admin/schemas");
	await page.locator(tid("admin-btn-add-schema")).click();
	await page.locator(tid("schema-create-dialog")).waitFor({ state: "visible" });
	await page.locator(tid("schema-create-name")).fill(name);
	await page
		.getByRole("radio", { name: /Заводская схема без типовых работ/i })
		.check();
	await page.locator(tid("schema-create-submit")).click();
	await page.waitForURL(/\/admin\/templates\/[^/]+\/edit/, {
		timeout: 180_000,
	});
	await waitForEditorReady(page);
}

/** Полная заводская схема (эталон + сид типовых работ). Может занять несколько минут. */
export async function createFullFactorySchema(page: Page, name: string) {
	await page.goto("/admin/schemas");
	await page.locator(tid("admin-btn-add-schema")).click();
	await page.locator(tid("schema-create-dialog")).waitFor({ state: "visible" });
	await page.locator(tid("schema-create-name")).fill(name);
	await page.locator('input[type="radio"][value="default"]').check();
	await page.locator(tid("schema-create-submit")).click();
	await page.waitForURL(/\/admin\/templates\/[^/]+\/edit/, {
		timeout: 600_000,
	});
	await waitForEditorReady(page);
}

/** Минимум работ в реестре factory (см. waitForV2FactoryTemplateReady). */
export const FACTORY_TYPICAL_WORKS_MIN_COUNT = 113;

export async function waitForFactoryTypicalWorks(
	request: APIRequestContext,
	templateId: string,
	opts?: { minCount?: number; timeoutMs?: number },
) {
	const minCount = opts?.minCount ?? FACTORY_TYPICAL_WORKS_MIN_COUNT;
	const timeoutMs = opts?.timeoutMs ?? 600_000;
	const deadline = Date.now() + timeoutMs;
	let lastTotal = 0;
	while (Date.now() < deadline) {
		const works = (await apiRequest(
			request,
			"GET",
			`/v2/works?templateId=${encodeURIComponent(templateId)}`,
		)) as { items?: unknown[]; total?: number };
		lastTotal = works.total ?? works.items?.length ?? 0;
		if (lastTotal >= minCount) return lastTotal;
		await new Promise((r) => setTimeout(r, 2_000));
	}
	throw new Error(
		`Типовые работы не загрузились: ${lastTotal}/${minCount} за ${timeoutMs}ms`,
	);
}

export type TypicalWorkListItem = {
	id: string;
	name: string;
	streams?: string[];
	streamExecutor?: string | null;
	archComponentType?: string | null;
};

export async function listTemplateTypicalWorks(
	request: APIRequestContext,
	templateId: string,
): Promise<TypicalWorkListItem[]> {
	const works = (await apiRequest(
		request,
		"GET",
		`/v2/works?templateId=${encodeURIComponent(templateId)}`,
	)) as { items: TypicalWorkListItem[] };
	return works.items ?? [];
}

export type TypicalWorkCardLite = {
	id: string;
	name: string;
	streamExecutor: string;
	formula?: { tokens?: unknown[]; text?: string };
	norms?: Array<{ streamExecutor: string; normValue: number }>;
	laborParams?: Array<{
		paramCode: string;
		paramName?: string | null;
		kind?: string | null;
		coefficients?: Array<{
			valueCode?: string | null;
			valueLabel?: string | null;
			coefficient?: number;
		}>;
	}>;
	rules?: Array<{ paramCode: string; paramName?: string | null }>;
};

export async function fetchTypicalWorkCard(
	request: APIRequestContext,
	workId: string,
	streamExecutor: string,
	versionId?: string,
): Promise<TypicalWorkCardLite> {
	const qs = new URLSearchParams({
		streamExecutor,
	});
	if (versionId) qs.set("templateVersionId", versionId);
	return (await apiRequest(
		request,
		"GET",
		`/v2/works/${workId}?${qs.toString()}`,
	)) as TypicalWorkCardLite;
}

/** Параллельный обход с лимитом concurrency. */
export async function mapPool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]!, i);
		}
	}
	const n = Math.max(1, Math.min(concurrency, items.length || 1));
	await Promise.all(Array.from({ length: n }, () => worker()));
	return results;
}

export async function previewTypicalWork(
	request: APIRequestContext,
	workId: string,
	streamExecutor: string,
	answers?: Record<string, string>,
): Promise<{
	result: number | null;
	error: string | null;
	formulaSymbolic?: string;
	triggerStatus?: string;
}> {
	return (await apiRequest(request, "POST", `/v2/works/${workId}/preview`, {
		streamExecutor,
		answers: answers ?? {},
	})) as {
		result: number | null;
		error: string | null;
		formulaSymbolic?: string;
		triggerStatus?: string;
	};
}

export async function createTypicalWorkViaUi(
	page: Page,
	opts: {
		name: string;
		norm: string;
		/** Зонтик — calculate без заполнения sourceSystems. */
		streamLabel?: string;
		archComponentType?: string;
	},
) {
	await openTypicalWorksPanel(page);
	await page.locator(tid("typical-works-create-new")).click();
	const dialog = page.locator(tid("typical-work-create-dialog"));
	await dialog.waitFor({ state: "visible" });
	await page.locator(tid("typical-work-create-name")).fill(opts.name);

	// SelectWithPlaceholder без label — первый combobox в диалоге
	const archType = opts.archComponentType ?? "Модельный сервис";
	await dialog.getByRole("combobox").first().click();
	await page.getByRole("option", { name: archType, exact: true }).click();
	await expect
		.poll(async () => dialog.getByRole("combobox").first().innerText())
		.toContain(archType);

	const streamLabel = opts.streamLabel ?? "Модельный стрим";
	await dialog.getByLabel("Стрим-исполнитель").click();
	await page
		.getByRole("option", { name: new RegExp(streamLabel, "i") })
		.first()
		.click();

	await page.locator(tid("typical-work-create-norm")).fill(opts.norm);
	await page.locator(tid("typical-work-create-submit")).click();
	await dialog.waitFor({ state: "hidden" });
	const workRow = page.getByText(opts.name, { exact: false }).first();
	await workRow.waitFor({ state: "visible" });
	await workRow.click();
}

/** Сохранить черновик версии (boundWorkIds / logic snapshot). */
export async function saveSchemaInPlace(page: Page) {
	await page.locator(tid("btnSave")).click();
	const saveInPlace = page.getByRole("button", {
		name: "Сохранить в этой версии",
	});
	if (await saveInPlace.isVisible({ timeout: 4_000 }).catch(() => false)) {
		await saveInPlace.click();
	}
	await page.waitForTimeout(2_000);
}

export async function saveAndActivateSchema(page: Page) {
	await saveSchemaInPlace(page);

	// Дождаться окончания savePending, чтобы кнопка активации была кликабельна
	const saveBtn = page.locator(tid("btnSave"));
	await expect(saveBtn).toBeEnabled({ timeout: 120_000 });

	const activate = page.locator(tid("btnActivate"));
	const visible = await activate
		.waitFor({ state: "visible", timeout: 15_000 })
		.then(() => true)
		.catch(() => false);
	if (!visible) {
		// Уже актуальная / кнопка скрыта — ок
		return;
	}
	await expect(activate).toBeEnabled({ timeout: 30_000 });
	await activate.click();

	// Подтверждение в диалоге (если есть) — иначе POST сразу
	const yes = page.getByRole("dialog").getByRole("button", {
		name: /Сделать актуальной|Подтвердить|Да|Опубликовать/i,
	});
	if (await yes.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
		await yes.first().click();
	}

	// Пока идёт публикация — «Публикация…» / disabled; после — кнопка пропадает
	await activate
		.waitFor({ state: "hidden", timeout: 180_000 })
		.catch(async () => {
			await expect(activate).toBeEnabled({ timeout: 180_000 });
		});
}

/** API: сделать версию актуальной (fallback / ускорение e2e). */
export async function activateTemplateVersionViaApi(
	request: APIRequestContext,
	templateId: string,
	versionId: string,
) {
	return apiRequest(
		request,
		"POST",
		`/v2/templates/${templateId}/versions/${versionId}/activate-as-current`,
	);
}

export async function createAnketaViaUi(
	page: Page,
	calcName: string,
	opts?: { templateId?: string },
) {
	const qs = opts?.templateId
		? `?templateId=${encodeURIComponent(opts.templateId)}`
		: "";
	await page.goto(`/v2/calculation/create${qs}`);
	const dialog = page.locator(tid("anketa-create-meta-dialog"));
	await dialog.waitFor({ state: "visible", timeout: 60_000 });
	await dialog.getByLabel("Название анкеты").fill(calcName);
	await page.locator(tid("anketa-create-meta-dialog--confirm")).click();
	// AnketaFormPageLayout вешает id как `${dataTestId}--root`
	await page.locator(tid("anketa-create-page--root")).waitFor({
		state: "visible",
		timeout: 180_000,
	});
	await page.locator(tid("anketa-create-page--loading")).waitFor({
		state: "hidden",
		timeout: 180_000,
	});
}

export function templateIdFromEditorUrl(url: string): string {
	const match = url.match(/\/admin\/templates\/([^/]+)\/edit/);
	if (!match?.[1]) throw new Error(`No templateId in URL: ${url}`);
	return match[1];
}

/**
 * Минимальный formData, при котором заводская схема даёт ненулевые типовые работы
 * (модельный сервис + витрина + модель + система-источник).
 */
export const FACTORY_ANKETA_SEED_FORM_DATA = {
	generalInfo: {
		modelService: [
			{ field_dEVFQVQn: "E2E MS1", workType: "Калибровка" },
		],
	},
	detailInfo: {
		modelsList: [{ "field_atxiq-UM": "E2E M1" }],
		dataMart: [{ field_zApubb5V: "E2E DM1", workType: "Разработка" }],
		sourceSystems: [{ name: "E2E S1", type: "Внутренний" }],
	},
} as const;

async function fillAnketaModalText(
	page: Page,
	label: string | RegExp,
	value: string,
) {
	const dialog = page.getByRole("dialog").last();
	await dialog.getByLabel(label).fill(value);
}

async function fillAnketaModalSelect(
	page: Page,
	label: string | RegExp,
	option: string,
) {
	const dialog = page.getByRole("dialog").last();
	await dialog.getByLabel(label).click();
	await page.getByRole("option", { name: option, exact: true }).click();
}

async function saveAnketaModal(page: Page) {
	const dialog = page.getByRole("dialog").last();
	await dialog.getByRole("button", { name: "Сохранить" }).click();
	await dialog.waitFor({ state: "hidden", timeout: 30_000 });
}

async function expandAnketaSection(page: Page, title: RegExp) {
	const section = page
		.locator(tid("formSection"))
		.filter({ hasText: title })
		.first();
	if (await section.isVisible().catch(() => false)) {
		const summary = section.locator(".MuiAccordionSummary-root").first();
		const expanded = await summary.getAttribute("aria-expanded");
		if (expanded !== "true") await summary.click();
		return;
	}

	const legacy = page
		.locator(tid("anketa-section-accordion-summary"))
		.filter({ hasText: title })
		.first();
	if (!(await legacy.isVisible().catch(() => false))) return;
	const expanded = await legacy.getAttribute("aria-expanded");
	if (expanded !== "true") await legacy.click();
}

/**
 * Заполнить арх. экземпляры в UI анкеты так же, как FACTORY_ANKETA_SEED_FORM_DATA.
 * Возвращает formData последнего успешного POST /calculate после заполнения.
 */
export async function fillFactoryAnketaSeedViaUi(page: Page): Promise<{
	formData: Record<string, unknown>;
}> {
	let lastFormData: Record<string, unknown> = {};
	const onCalc = async (res: import("@playwright/test").Response) => {
		if (
			!res.url().includes("/calculate") ||
			res.request().method() !== "POST" ||
			!res.ok()
		) {
			return;
		}
		try {
			const body = (await res.json()) as { formData?: Record<string, unknown> };
			if (body.formData) lastFormData = body.formData;
		} catch {
			/* ignore parse errors */
		}
	};
	page.on("response", onCalc);

	try {
		await expandAnketaSection(page, /Общая информация/i);

		const addModelService = page.locator(
			tid("anketa-arch-object-panel--generalInfo-modelService--add"),
		);
		if (await addModelService.isVisible().catch(() => false)) {
			await addModelService.click();
		} else {
			await page
				.getByRole("button", { name: /Добавить модельный сервис/i })
				.click();
		}
		await fillAnketaModalText(
			page,
			/Название модельного сервиса/i,
			"E2E MS1",
		);
		await fillAnketaModalSelect(page, /Тип работ/i, "Калибровка");
		await saveAnketaModal(page);

		await expandAnketaSection(page, /Детальная информация/i);
		await page
			.locator(tid("formSection"))
			.filter({ hasText: /Детальная информация/i })
			.first()
			.scrollIntoViewIfNeeded();

		const addDataMart = page.locator(
			tid("anketa-arch-object-panel--detailInfo-dataMart--add"),
		);
		await expect(addDataMart).toBeVisible({ timeout: 30_000 });
		await addDataMart.scrollIntoViewIfNeeded();
		await addDataMart.click();
		await fillAnketaModalText(
			page,
			/Название объекта\/витрины данных/i,
			"E2E DM1",
		);
		await fillAnketaModalSelect(page, /Тип работ/i, "Разработка");
		await saveAnketaModal(page);

		await page.getByRole("button", { name: /Добавить модели/i }).click();
		await fillAnketaModalText(page, /Название модели/i, "E2E M1");
		await saveAnketaModal(page);

		await page
			.getByRole("button", { name: /Добавить системы источники/i })
			.click();
		await fillAnketaModalText(page, /Название источника/i, "E2E S1");
		await fillAnketaModalSelect(page, /Тип системы-источника/i, "Внутренний");
		await saveAnketaModal(page);

		await expect(
			page.getByText("01. Постановка задачи", { exact: false }).first(),
		).toBeVisible({ timeout: 120_000 });

		// Устоявшийся typicalTotal (после debounce нескольких calculate)
		await expect
			.poll(
				() => {
					const summary = lastFormData.summary as
						| { typicalTotal?: unknown }
						| undefined;
					const total =
						typeof summary?.typicalTotal === "number"
							? summary.typicalTotal
							: Number(summary?.typicalTotal);
					return Number.isFinite(total) ? total : 0;
				},
				{ timeout: 60_000 },
			)
			.toBeGreaterThan(100);

		// Пауза на возможный финальный debounce-пересчёт
		await page.waitForTimeout(2_500);

		return { formData: lastFormData };
	} finally {
		page.off("response", onCalc);
	}
}
