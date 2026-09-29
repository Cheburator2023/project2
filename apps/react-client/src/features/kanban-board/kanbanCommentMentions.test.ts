import { describe, expect, it } from "vitest";
import {
	extractKanbanCommentMentionNames,
	getKanbanCommentMentionQueryAtCursor,
	insertKanbanCommentMention,
	replaceKanbanCommentMentionQuery,
	splitKanbanCommentBodyWithMentions,
} from "./kanbanCommentMentions";

const names = ["Иванов", "Иван Иванов", "Петров"];

describe("kanbanCommentMentions", () => {
	it("extracts bare and quoted mentions with longest match", () => {
		expect(
			extractKanbanCommentMentionNames('Привет @"Иван Иванов" и @Петров', names),
		).toEqual(["Иван Иванов", "Петров"]);
		expect(
			extractKanbanCommentMentionNames("Смотри @Иванов ок", names),
		).toEqual(["Иванов"]);
	});

	it("inserts a mention at cursor", () => {
		expect(insertKanbanCommentMention("", "Петров")).toEqual({
			body: "@Петров",
			cursor: 7,
		});
		expect(insertKanbanCommentMention("текст", "Иван Иванов", 5)).toEqual({
			body: 'текст @"Иван Иванов"',
			cursor: 20,
		});
	});

	it("detects @query at cursor for autocomplete", () => {
		const draft = "эй @Пе";
		expect(
			getKanbanCommentMentionQueryAtCursor(draft, draft.length),
		).toEqual({
			query: "Пе",
			start: 3,
			end: draft.length,
		});
		expect(getKanbanCommentMentionQueryAtCursor("без меншна", 4)).toBeNull();
	});

	it("replaces query with selected assignee", () => {
		const draft = "эй @Пе";
		expect(
			replaceKanbanCommentMentionQuery(
				draft,
				{ start: 3, end: draft.length },
				"Петров",
			),
		).toEqual({ body: "эй @Петров ", cursor: 11 });
	});

	it("splits body for mention highlighting", () => {
		const parts = splitKanbanCommentBodyWithMentions(
			"ок @Петров спасибо",
			names,
		);
		expect(parts).toEqual([
			{ text: "ок " },
			{ text: "@Петров", mention: true },
			{ text: " спасибо" },
		]);
	});
});
