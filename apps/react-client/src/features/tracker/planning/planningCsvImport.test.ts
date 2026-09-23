import { describe, expect, it } from "vitest";
import {
	inferPlanningSystemFromTitle,
	matchPlanningCsvRows,
	parsePlanningCsv,
	planningTaskTitleSimilarity,
} from "./planningCsvImport";

const columns = [
	{ id: "todo", title: "Сделать" },
	{ id: "demo", title: "Релизы" },
	{ id: "input_buffer", title: "Входной буфер" },
];

describe("planningTaskTitleSimilarity", () => {
	it("treats punctuation and latin lookalikes as the same title", () => {
		expect(
			planningTaskTitleSimilarity(
				'Убрать "колокольчик" с уведомлениями в Cмарт-анкете',
				"Убрать колокольчик с уведомлениями в Смарт-анкете",
			),
		).toBe(100);
	});

	it("keeps a prefixed title above the match threshold", () => {
		expect(
			planningTaskTitleSimilarity(
				"RDS-395183 Переход на безопасный протокол аутентификации в PostgreSQL",
				"Переход на безопасный протокол аутентификации в PostgreSQL в ИС 1661",
			),
		).toBeGreaterThanOrEqual(72);
	});
});

describe("inferPlanningSystemFromTitle", () => {
	it("reads a single system and skips a mixed title", () => {
		expect(inferPlanningSystemFromTitle("[DL] Изучение базы для DL")).toBe(
			"data-lineage",
		);
		expect(inferPlanningSystemFromTitle("Ошибка в СА: пагинация")).toBe(
			"smart-anketa",
		);
		expect(inferPlanningSystemFromTitle("[SUM_RM] баг в реестре СУРМ")).toBe(
			"sum-rm",
		);
		expect(
			inferPlanningSystemFromTitle("Синхронизация атрибутов из СУМ в СУРМ"),
		).toBeNull();
	});
});

describe("parsePlanningCsv", () => {
	it("reads estimates, sprint and a multiline quoted description", () => {
		const csv = [
			"Статус;Название задачи;Описание;Спринт;Аналитик;Разработчик;Комментарий",
			'demo;Задача;"строка 1',
			'строка 2";SP-1;1,5;2;нужно уточнить',
		].join("\n");
		const rows = parsePlanningCsv(csv);
		expect(rows).toEqual([
			expect.objectContaining({
				statusRaw: "demo",
				title: "Задача",
				description: "строка 1\nстрока 2",
				sprintCode: "SP-1",
				estimates: { analyst: 1.5, developer: 2 },
				comment: "нужно уточнить",
			}),
		]);
	});
});

describe("matchPlanningCsvRows", () => {
	const tasks = [
		{
			id: "known",
			boardId: "board",
			taskKey: "COMMON-1",
			title: "Убрать колокольчик с уведомлениями в Смарт-анкете",
			sprintId: "old-sprint",
			roleEstimates: { analyst: 1 },
		},
	];

	it("updates a fuzzy title and creates a missing task in its status", () => {
		const rows = parsePlanningCsv(
			[
				"Статус;Название задачи;Спринт;Аналитик;Комментарий",
				'demo;Убрать "колокольчик" с уведомлениями в Cмарт-анкете;SP-9;3;уточнение',
				"Новая;Совсем новая задача;;",
			].join("\n"),
		);
		const matches = matchPlanningCsvRows({
			rows,
			tasks,
			columns,
			sprints: [{ id: "spr", code: "SP-9", name: "Спринт" }],
			boardId: "board",
		});
		expect(matches[0]).toEqual(
			expect.objectContaining({
				action: "update",
				score: 100,
				sprintId: "spr",
				nextEstimates: { analyst: 3 },
				systemId: "smart-anketa",
			}),
		);
		expect(matches[0]?.task?.id).toBe("known");
		expect(matches[1]).toEqual(
			expect.objectContaining({
				action: "create",
				statusId: "todo",
				statusTitle: "Сделать",
				task: null,
			}),
		);
	});

	it("does not give one existing task to two csv rows", () => {
		const rows = parsePlanningCsv(
			[
				"Статус;Название задачи",
				"todo;Убрать колокольчик с уведомлениями в Смарт-анкете",
				"todo;Убрать колокольчик с уведомлениями в Смарт-анкете",
			].join("\n"),
		);
		const matches = matchPlanningCsvRows({
			rows,
			tasks,
			columns,
			sprints: [],
		});
		expect(matches.map((item) => item.action)).toEqual(["unchanged", "create"]);
		expect(matches[0]?.task?.id).toBe("known");
		expect(matches[1]?.task).toBeNull();
	});

	it("matches only tasks on the selected board", () => {
		const rows = parsePlanningCsv(
			[
				"Статус;Название задачи",
				"todo;Убрать колокольчик с уведомлениями в Смарт-анкете",
			].join("\n"),
		);
		const matches = matchPlanningCsvRows({
			rows,
			tasks: [
				...tasks,
				{
					id: "other-board",
					boardId: "other",
					taskKey: "OTHER-1",
					title: "Убрать колокольчик с уведомлениями в Смарт-анкете",
				},
			],
			columns,
			sprints: [],
			boardId: "other",
		});
		expect(matches[0]?.action).not.toBe("create");
		expect(matches[0]?.task?.id).toBe("other-board");
		const skipped = matchPlanningCsvRows({
			rows,
			tasks,
			columns,
			sprints: [],
			boardId: "empty-board",
		});
		expect(skipped[0]?.action).toBe("create");
		expect(skipped[0]?.task).toBeNull();
	});
});
