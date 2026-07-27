import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	mergeOverallUncertaintyConfigIntoLogic,
	type V2OverallUncertaintyConfig,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { applyOverallUncertaintyConfigToSchema } from "./overallUncertaintySchemaSync";

/**
 * Черновик настроек «Общая неопределённость» переживает unmount панели
 * (вкладка uncertainty монтируется только когда открыта).
 * Save DTO всегда мержит этот store в logic/ui.
 *
 * Ключ — templateId (не versionId): «сохранить как новую версию» меняет versionId,
 * а правки должны уйти в DTO.
 */
type UncertaintyDraftEntry = {
	templateId: string;
	config: V2OverallUncertaintyConfig;
};

let draft: UncertaintyDraftEntry | null = null;

export function setOverallUncertaintyDraft(input: {
	templateId: string;
	config: V2OverallUncertaintyConfig;
}): void {
	draft = {
		templateId: input.templateId,
		config: structuredClone(input.config),
	};
}

export function clearOverallUncertaintyDraft(templateId?: string): void {
	if (!draft) return;
	if (templateId != null && draft.templateId !== templateId) return;
	draft = null;
}

export function peekOverallUncertaintyDraft(input: {
	templateId: string;
}): V2OverallUncertaintyConfig | null {
	if (!draft) return null;
	if (draft.templateId !== input.templateId) return null;
	return structuredClone(draft.config);
}

/** Вшивает черновик неопределённости в snapshot перед PUT/POST версии. */
export function applyOverallUncertaintyDraftToVersionSnapshot(input: {
	templateId: string;
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: V2LogicGraphDto;
}): {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: V2LogicGraphDto;
} {
	const config = peekOverallUncertaintyDraft({
		templateId: input.templateId,
	});
	if (!config) {
		return {
			jsonSchema: input.jsonSchema,
			uiSchema: input.uiSchema,
			logic: input.logic,
		};
	}

	const synced = applyOverallUncertaintyConfigToSchema(
		input.jsonSchema,
		input.uiSchema,
		config,
	);
	return {
		jsonSchema: synced.jsonSchema,
		uiSchema: synced.uiSchema,
		logic: {
			...input.logic,
			rules: mergeOverallUncertaintyConfigIntoLogic(
				input.logic.rules ?? [],
				config,
			),
		},
	};
}
