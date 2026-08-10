import { describe, expect, it } from "vitest";
import type { UiSchema } from "@rjsf/utils";
import {
	createDefaultV2AnketaWorkflow,
	V2_IMPLEMENTATION_STREAM,
} from "@smart-anketa/api-contract";
import { isAnketaArchPathReadOnly } from "./anketaPathLock.util";
import { applyViewerStreamLocksToUiSchema } from "./anketaSectionUiSchema";

/** detailInfo намеренно помечен стрим-блоком модельных стримов — как в боевой схеме. */
const STREAM_UI_SCHEMA: UiSchema = {
	generalInfo: { "ui:options": { sectionRole: "main" } },
	detailInfo: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.KMBKCB,
		},
	},
	streamDadm: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.DADM,
		},
	},
	streamPirm: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
		},
		sourceSystems: {},
	},
};

describe("isAnketaArchPathReadOnly", () => {
	it("locks paths inside a completed main section", () => {
		const workflow = createDefaultV2AnketaWorkflow();
		workflow.sections.detailInfo = "Заполнено";

		expect(
			isAnketaArchPathReadOnly(
				{ workflow },
				"detailInfo.detailAtypicalTasks",
			),
		).toBe(true);
		expect(
			isAnketaArchPathReadOnly({ workflow }, "generalInfo.modelService"),
		).toBe(false);
	});

	it("locks paths inside a completed panel section", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			panelSections: {
				"detailInfo.customPanel": "Заполнено" as const,
			},
		};

		expect(
			isAnketaArchPathReadOnly(
				{ workflow },
				"detailInfo.customPanel.atypicalTasks",
			),
		).toBe(true);
	});

	it("закрывает арх-панели чужого стрима представителю стрима", () => {
		// Кнопки «добавить/удалить» в арх-таблицах не читают ui:readonly — нужен путь.
		const ctx = {
			workflow: createDefaultV2AnketaWorkflow(),
			previewUiSchema: STREAM_UI_SCHEMA,
			viewerAccess: {
				roles: ["sarep"],
				streams: [V2_IMPLEMENTATION_STREAM.DADM],
				applyAccessRules: true,
			},
		};

		expect(isAnketaArchPathReadOnly(ctx, "streamPirm.sourceSystems")).toBe(true);
		expect(isAnketaArchPathReadOnly(ctx, "streamDadm.sourceSystems")).toBe(false);
		expect(isAnketaArchPathReadOnly(ctx, "generalInfo.modelService")).toBe(false);
	});
});

describe("applyViewerStreamLocksToUiSchema", () => {
	const sarepDadm = {
		roles: ["sarep"],
		streams: [V2_IMPLEMENTATION_STREAM.DADM],
		applyAccessRules: true,
	};

	it("помечает readonly только чужие стрим-блоки", () => {
		const locked = applyViewerStreamLocksToUiSchema(
			STREAM_UI_SCHEMA,
			sarepDadm,
		);

		expect(locked.streamPirm?.["ui:readonly"]).toBe(true);
		expect(locked.streamPirm?.sourceSystems?.["ui:readonly"]).toBe(true);
		expect(locked.streamDadm?.["ui:readonly"]).toBeUndefined();
		// detailInfo — стрим-блок модельных стримов, но по требованиям это общая вкладка.
		expect(locked.detailInfo?.["ui:readonly"]).toBeUndefined();
		expect(locked.generalInfo?.["ui:readonly"]).toBeUndefined();
	});

	it("ничего не меняет без ролевых правил и для остальных ролей", () => {
		expect(
			applyViewerStreamLocksToUiSchema(STREAM_UI_SCHEMA, {
				...sarepDadm,
				applyAccessRules: false,
			}),
		).toBe(STREAM_UI_SCHEMA);
		expect(
			applyViewerStreamLocksToUiSchema(STREAM_UI_SCHEMA, {
				roles: ["ds_lead"],
				streams: [V2_IMPLEMENTATION_STREAM.DADM],
				applyAccessRules: true,
			}),
		).toBe(STREAM_UI_SCHEMA);
	});
});
