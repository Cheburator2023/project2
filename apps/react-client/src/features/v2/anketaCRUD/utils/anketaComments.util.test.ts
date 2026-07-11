import { describe, expect, it } from "vitest";
import {
	authorInitials,
	buildCommentTree,
	hashAuthorColor,
	sortCommentRoots,
} from "./anketaComments.util";

describe("anketaComments helpers", () => {
	it("builds threaded comment tree", () => {
		const tree = buildCommentTree([
			{
				id: "1",
				questionnaireId: "q1",
				parentCommentId: null,
				body: "root",
				authorName: "A",
				isAnketaAuthor: true,
				createdAt: "2026-01-01T10:00:00.000Z",
			},
			{
				id: "2",
				questionnaireId: "q1",
				parentCommentId: "1",
				body: "reply",
				authorName: "B",
				isAnketaAuthor: false,
				createdAt: "2026-01-01T11:00:00.000Z",
			},
		]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.replies).toHaveLength(1);
		expect(tree[0]?.replies[0]?.body).toBe("reply");
	});

	it("sorts root comments by createdAt", () => {
		const roots = sortCommentRoots(
			[
				{
					id: "old",
					questionnaireId: "q1",
					parentCommentId: null,
					body: "old",
					authorName: "A",
					isAnketaAuthor: false,
					createdAt: "2026-01-01T10:00:00.000Z",
					replies: [],
				},
				{
					id: "new",
					questionnaireId: "q1",
					parentCommentId: null,
					body: "new",
					authorName: "B",
					isAnketaAuthor: false,
					createdAt: "2026-01-02T10:00:00.000Z",
					replies: [],
				},
			],
			"recent",
		);
		expect(roots.map((item) => item.id)).toEqual(["new", "old"]);
	});

	it("resolves author initials and stable color", () => {
		expect(authorInitials("Иван Петров")).toBe("ИП");
		expect(hashAuthorColor("Иван Петров", ["#111", "#222"])).toBe(
			hashAuthorColor("Иван Петров", ["#111", "#222"]),
		);
	});
});
