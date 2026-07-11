import {
	kanbanBoardIsDoneColumn,
	kanbanBoardTaskImageCleanupCutoffIso,
	kanbanBoardTaskImageDoneRetentionDays,
	kanbanBoardTaskImageReadCandidates,
	kanbanBoardTaskImageRefsEqual,
	kanbanBoardTaskImageRelativeFromStored,
	kanbanBoardTaskImageStoragePaths,
} from "../../../../src/modules/kanban-board/utils/kanban-board-task-image.util";

describe("kanban-board-task-image.util", () => {
	it("detects done column by id and title", () => {
		expect(kanbanBoardIsDoneColumn({ id: "done", title: "Готово" })).toBe(true);
		expect(kanbanBoardIsDoneColumn({ id: "custom", title: "готово" })).toBe(
			true,
		);
		expect(kanbanBoardIsDoneColumn({ id: "todo", title: "К выполнению" })).toBe(
			false,
		);
	});

	it("parses retention days from env", () => {
		expect(kanbanBoardTaskImageDoneRetentionDays(undefined)).toBe(7);
		expect(kanbanBoardTaskImageDoneRetentionDays("14")).toBe(14);
		expect(kanbanBoardTaskImageDoneRetentionDays("0")).toBe(7);
		expect(kanbanBoardTaskImageDoneRetentionDays("bad")).toBe(7);
	});

	it("builds cutoff iso in the past", () => {
		const cutoff = kanbanBoardTaskImageCleanupCutoffIso(7);
		expect(Date.parse(cutoff)).toBeLessThan(Date.now());
	});

	it("builds canonical storage paths and read candidates", () => {
		const row = {
			id: "01IMG",
			taskId: "01TASK",
			mimeType: "image/webp",
			fullPath: "/old/abs/01TASK/01IMG-full.webp",
			thumbPath: "/old/abs/01TASK/01IMG-thumb.webp",
		};
		const paths = kanbanBoardTaskImageStoragePaths("/data/images", row);
		expect(paths.fullPath).toBe("/data/images/01TASK/01IMG-full.webp");
		expect(paths.thumbPath).toBe("/data/images/01TASK/01IMG-thumb.webp");
		expect(
			kanbanBoardTaskImageReadCandidates("/data/images", row, "full"),
		).toEqual([
			"/data/images/01TASK/01IMG-full.webp",
			"/old/abs/01TASK/01IMG-full.webp",
			"/data/images/01TASK/01IMG-full.png",
		]);
	});

	it("compares image refs by id", () => {
		expect(
			kanbanBoardTaskImageRefsEqual(
				[{ id: "a" }, { id: "b" }],
				[{ id: "a" }, { id: "b" }],
			),
		).toBe(true);
		expect(
			kanbanBoardTaskImageRefsEqual([{ id: "a" }], [{ id: "b" }]),
		).toBe(false);
	});

	it("extracts relative path from legacy absolute stored path", () => {
		expect(
			kanbanBoardTaskImageRelativeFromStored(
				"/Users/dev/smart_anketa_ui/apps/nestjs-server/data/kanban-task-images/01TASK/01IMG-full.webp",
			),
		).toBe("01TASK/01IMG-full.webp");
	});

	it("includes alternate extensions and relative stored paths in read candidates", () => {
		const row = {
			id: "01IMG",
			taskId: "01TASK",
			mimeType: "image/webp",
			fullPath:
				"/old/abs/kanban-task-images/01TASK/01IMG-full.webp",
			thumbPath:
				"/old/abs/kanban-task-images/01TASK/01IMG-thumb.webp",
		};
		const candidates = kanbanBoardTaskImageReadCandidates(
			"/data/images",
			row,
			"full",
		);
		expect(candidates).toContain("/data/images/01TASK/01IMG-full.webp");
		expect(candidates).toContain("/data/images/01TASK/01IMG-full.png");
		expect(candidates).toContain(
			"/old/abs/kanban-task-images/01TASK/01IMG-full.webp",
		);
	});
});
