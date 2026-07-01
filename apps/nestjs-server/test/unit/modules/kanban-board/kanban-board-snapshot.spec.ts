import { DataSource, Repository } from "typeorm";
import {
	boardsEquivalent,
	defaultKanbanBoardColumns,
	fromBoardData,
	toBoardData,
	type KanbanBoardData,
	type KanbanBoardTaskRecord,
} from "@smart-anketa/api-contract";
import { KanbanBoardTaskEntity } from "../../../../src/modules/kanban-board/entities/kanban-board-task.entity";
import { KanbanBoardService } from "../../../../src/modules/kanban-board/services/kanban-board.service";
import {
	assertSnapshotImportable,
	exportXlsx,
	hashPayload,
	importXlsx,
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../../../../src/modules/kanban-board/utils/kanban-board-snapshot.util";

const buildBoard = (): KanbanBoardData => ({
	root: {
		id: "root",
		title: "Root",
		parentId: null,
		children: ["backlog", "todo", "in_progress", "review", "qa", "done"],
		totalChildrenCount: 6,
	},
	backlog: {
		id: "backlog",
		title: "Бэклог",
		parentId: "root",
		children: ["01JABCDEFGHJKMNPQRSTVWXYZ0"],
		totalChildrenCount: 1,
	},
	todo: {
		id: "todo",
		title: "К выполнению",
		parentId: "root",
		children: [],
		totalChildrenCount: 0,
	},
	in_progress: {
		id: "in_progress",
		title: "В работе",
		parentId: "root",
		children: [],
		totalChildrenCount: 0,
	},
	review: {
		id: "review",
		title: "Ревью",
		parentId: "root",
		children: [],
		totalChildrenCount: 0,
	},
	qa: {
		id: "qa",
		title: "QA",
		parentId: "root",
		children: [],
		totalChildrenCount: 0,
	},
	done: {
		id: "done",
		title: "Готово",
		parentId: "root",
		children: [],
		totalChildrenCount: 0,
	},
	"01JABCDEFGHJKMNPQRSTVWXYZ0": {
		id: "01JABCDEFGHJKMNPQRSTVWXYZ0",
		title: "Первая задача",
		parentId: "backlog",
		children: [],
		totalChildrenCount: 0,
		type: "card",
		content: {
			title: "Первая задача",
			description: "Описание",
			priority: "high",
			assignee: "Alice",
		},
		origin: "stand-a",
	},
});

const BOARD_ID = "01J000000000000000000014";

const BOARD_COLUMNS = defaultKanbanBoardColumns(BOARD_ID).map((column) => ({
	...column,
	createdAt: "2026-06-16T00:00:00.000Z",
	updatedAt: "2026-06-16T00:00:00.000Z",
}));

describe("kanban board snapshot utils", () => {
	it("round-trips board data through xlsx import/export", async () => {
		const stand = "stand-a";
		const now = "2026-06-16T12:00:00.000Z";
		const rows = fromBoardData(buildBoard(), stand, now, BOARD_ID);
		const exported = await exportXlsx(rows, stand);
		const { meta, payload } = await importXlsx(exported);

		expect(meta.sourceStand).toBe(stand);
		expect(meta.rowCount).toBe(rows.length);
		assertSnapshotImportable(meta, payload);

		const restoredBoard = toBoardData(payload, BOARD_COLUMNS);
		expect(boardsEquivalent(buildBoard(), restoredBoard)).toBe(true);
	});

	it("rejects tampered payload by sha256", async () => {
		const stand = "stand-a";
		const rows = fromBoardData(
			buildBoard(),
			stand,
			"2026-06-16T12:00:00.000Z",
			BOARD_ID,
		);
		const exported = await exportXlsx(rows, stand);
		const parsed = await importXlsx(exported);
		parsed.payload[0] = {
			...parsed.payload[0],
			content: { ...parsed.payload[0].content, title: "Подмена" },
		};

		expect(() => assertSnapshotImportable(parsed.meta, parsed.payload)).toThrow(
			SnapshotIntegrityError,
		);
	});

	it("rejects newer schemaVersion", () => {
		const rows: KanbanBoardTaskRecord[] = [];
		expect(() =>
			assertSnapshotImportable(
				{
					schemaVersion: 99,
					sourceStand: "x",
					exportedAt: "2026-01-01T00:00:00.000Z",
					rowCount: 0,
					sha256: hashPayload(rows),
				},
				rows,
			),
		).toThrow(SnapshotSchemaError);
	});
});

describe("KanbanBoardService importSnapshot", () => {
	it("mirrors tasks by origin and removes stale rows", async () => {
		const stand = "stand-a";
		const now = "2026-06-16T12:00:00.000Z";
		const rows = fromBoardData(buildBoard(), stand, now, BOARD_ID);
		const exported = await exportXlsx(rows, stand);

		const stored: KanbanBoardTaskEntity[] = [
			{
				id: "01JABCDEFGHJKMNPQRSTVWXYZ0",
				boardId: BOARD_ID,
				parentId: "backlog",
				position: 0,
				content: { title: "Старая версия" },
				origin: stand,
				updatedAt: now,
			},
			{
				id: "01JSTALE00000000000000000",
				boardId: BOARD_ID,
				parentId: "todo",
				position: 0,
				content: { title: "Удалить меня" },
				origin: stand,
				updatedAt: now,
			},
			{
				id: "01JLOCAL00000000000000000",
				boardId: BOARD_ID,
				parentId: "todo",
				position: 0,
				content: { title: "Локальная задача другого стенда" },
				origin: "stand-b",
				updatedAt: now,
			},
		];

		const repo = {
			find: jest.fn(async ({ where }: { where?: { origin?: string } }) => {
				if (where?.origin) {
					return stored.filter((row) => row.origin === where.origin);
				}
				return [...stored];
			}),
			remove: jest.fn(async (entities: KanbanBoardTaskEntity[]) => {
				for (const entity of entities) {
					const index = stored.findIndex((row) => row.id === entity.id);
					if (index >= 0) stored.splice(index, 1);
				}
			}),
			save: jest.fn(async (entity: KanbanBoardTaskEntity) => {
				const index = stored.findIndex((row) => row.id === entity.id);
				if (index >= 0) stored[index] = entity;
				else stored.push(entity);
				return entity;
			}),
		} as unknown as Repository<KanbanBoardTaskEntity>;

		const dataSource = {
			transaction: jest.fn(async (fn: (manager: { getRepository: () => typeof repo }) => Promise<void>) =>
				fn({ getRepository: () => repo }),
			),
		} as unknown as DataSource;

		const service = new KanbanBoardService(
			repo,
			dataSource,
			{ get: () => "local-dev" } as any,
		);

		const result = await service.importSnapshot(exported);
		expect(result.meta.sourceStand).toBe(stand);
		expect(stored.some((row) => row.id === "01JSTALE00000000000000000")).toBe(
			false,
		);
		expect(stored.some((row) => row.id === "01JLOCAL00000000000000000")).toBe(
			true,
		);
		expect(
			stored.find((row) => row.id === "01JABCDEFGHJKMNPQRSTVWXYZ0")?.content
				.title,
		).toBe("Первая задача");
	});
});
