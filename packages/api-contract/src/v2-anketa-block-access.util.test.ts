import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import {
	isBlockVisibleForUser,
	resolveV2AnketaBlockAccessRestrictionsForOutputPath,
	shouldApplyV2AnketaBlockAccessAtPath,
	shouldMaskWorkEstimatesForUser,
	type V2AnketaViewerAccessContext,
} from "./v2-anketa-block-access.util";
import { describe, expect, it } from "vitest";

const uiSchema = {
	streamDataSources: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
			streamBlockRoles: ["ds"],
		},
		sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
		atypicalTasks: { "ui:options": { archComponent: "atypicalWork" } },
	},
	streamPirm: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
		},
	},
	generalInfo: { "ui:options": { sectionRole: "main" } },
};

describe("v2-anketa-block-access.util", () => {
	it("detects access points on stream blocks and arch work arrays", () => {
		expect(shouldApplyV2AnketaBlockAccessAtPath(uiSchema, "streamDataSources")).toBe(
			true,
		);
		expect(
			shouldApplyV2AnketaBlockAccessAtPath(
				uiSchema,
				"streamDataSources.sourceTypicalTasks",
			),
		).toBe(true);
		expect(shouldApplyV2AnketaBlockAccessAtPath(uiSchema, "generalInfo")).toBe(
			false,
		);
	});

	it("hides block when role and stream do not match", () => {
		const viewer: V2AnketaViewerAccessContext = {
			roles: ["de"],
			streams: [V2_IMPLEMENTATION_STREAM.DADM],
		};
		const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
			uiSchema,
			"streamDataSources",
		);
		expect(isBlockVisibleForUser(viewer, restrictions)).toBe(false);
	});

	it("shows block when stream matches", () => {
		const viewer: V2AnketaViewerAccessContext = {
			roles: ["de"],
			streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
		};
		const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
			uiSchema,
			"streamDataSources",
		);
		expect(isBlockVisibleForUser(viewer, restrictions)).toBe(true);
	});

	it("shows all blocks for leads but masks foreign stream estimates", () => {
		const viewer: V2AnketaViewerAccessContext = {
			roles: ["ds_lead"],
			streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
		};
		const pirmRestrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
			uiSchema,
			"streamPirm",
		);
		expect(isBlockVisibleForUser(viewer, pirmRestrictions)).toBe(true);
		expect(shouldMaskWorkEstimatesForUser(viewer, pirmRestrictions.streamExecutors)).toBe(
			true,
		);
		expect(
			shouldMaskWorkEstimatesForUser(
				viewer,
				resolveV2AnketaBlockAccessRestrictionsForOutputPath(
					uiSchema,
					"streamDataSources",
				).streamExecutors,
			),
		).toBe(false);
	});
});
