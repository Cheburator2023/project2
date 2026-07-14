import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Form from "@rjsf/mui";
import type { UiSchema } from "@rjsf/utils";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { v2AnketaFormTemplates } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormTemplates";
import { v2AnketaFormWidgets } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormWidgets";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import {
	mergeAnketaFormContext,
	type AnketaFormContextValue,
} from "../utils/anketaFormContext";
import { withHiddenArchModalFields } from "../utils/anketaArchModalUiSchema";
import {
	resolveAnketaFormModalBindingSets,
	type AnketaFormModalBindingSets,
} from "../utils/anketaFormModalPaths";
import { applySectionLocksToUiSchema } from "../utils/anketaSectionUiSchema";
import {
	readWorkflowFromFormData,
	touchSectionInFormData,
} from "../hooks/useAnketaWorkflow";
import {
	isV2AnketaHiddenUiNode,
	setGroupActivationAtPath,
	collectGeneratedTypicalWorkArrayPaths,
	type V2AnketaMainSectionId,
} from "@smart-anketa/api-contract";
import { IS_DEV } from "@react-client/common/constants/dev";
import {
	attachTypicalWorkRowInfluence,
	buildCalculationInfluenceByPath,
} from "../utils/anketaCalculationDev.util";
import {
	applyRjsfFormChangeToAnketaFormData,
	normalizeAnketaFormDataForRjsf,
} from "../utils/anketaRjsfFormData.util";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

type Props = {
	source?: V2AnketaSchemaEngineSource | null;
	engine?: V2AnketaSchemaEngine;
	readOnly?: boolean;
	hiddenTopLevelFields?: string[];
	anketaFormContext?: Partial<
		Omit<AnketaFormContextValue, "formData" | "previewSchema" | "previewUiSchema">
	>;
	modalBindings?: AnketaFormModalBindingSets;
	formRemountKey?: number;
	"data-test-id"?: string;
};

function withHiddenTopLevelFields(
	uiSchema: UiSchema,
	fieldNames: string[],
): UiSchema {
	if (fieldNames.length === 0) return uiSchema;
	const next: UiSchema = { ...uiSchema };
	for (const fieldName of fieldNames) {
		const fieldUiSchema =
			next[fieldName] && typeof next[fieldName] === "object"
				? ({ ...(next[fieldName] as UiSchema) } as UiSchema)
				: {};
		const options =
			fieldUiSchema["ui:options"] &&
			typeof fieldUiSchema["ui:options"] === "object" &&
			!Array.isArray(fieldUiSchema["ui:options"])
				? { ...(fieldUiSchema["ui:options"] as Record<string, unknown>) }
				: {};
		next[fieldName] = {
			...fieldUiSchema,
			"ui:widget": "hidden",
			"ui:options": { ...options, hidden: true },
		};
	}
	return next;
}

function setNestedUiOption(
	uiSchema: UiSchema,
	path: string,
	patch: Record<string, unknown>,
): UiSchema {
	const parts = path.split(".");
	const next: UiSchema = { ...uiSchema };
	let current: UiSchema = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child =
			current[key] && typeof current[key] === "object"
				? ({ ...(current[key] as UiSchema) } as UiSchema)
				: {};
		current[key] = child;
		current = child;
	}

	const lastKey = parts[parts.length - 1];
	const leaf =
		current[lastKey] && typeof current[lastKey] === "object"
			? ({ ...(current[lastKey] as UiSchema) } as UiSchema)
			: {};
	const options =
		leaf["ui:options"] &&
		typeof leaf["ui:options"] === "object" &&
		!Array.isArray(leaf["ui:options"])
			? { ...(leaf["ui:options"] as Record<string, unknown>) }
			: {};

	current[lastKey] = {
		...leaf,
		"ui:options": { ...options, ...patch },
	};

	return next;
}

function withCompactArrayFields(
	uiSchema: UiSchema,
	compactPaths: Iterable<string>,
): UiSchema {
	let next = uiSchema;
	for (const path of compactPaths) {
		next = setNestedUiOption(next, path, { addable: false, removable: false });
	}
	return next;
}

function FormNotice({
	children,
	color = "text.secondary",
	testId,
}: {
	children: ReactNode;
	color?: string;
	testId?: string;
}) {
	return (
		<Typography
			variant="body2"
			color={color}
			sx={{ mb: 2 }}
			data-test-id={testId}
		>
			{children}
		</Typography>
	);
}

export function V2AnketaSchemaForm({
	source,
	engine: engineProp,
	readOnly = false,
	hiddenTopLevelFields = [],
	anketaFormContext,
	modalBindings: modalBindingsProp,
	formRemountKey,
	"data-test-id": dataTestId = "v2-anketa-schema-form",
}: Props) {
	const internalEngine = useV2AnketaSchemaEngine(
		engineProp ? null : (source ?? null),
	);
	const engine = engineProp ?? internalEngine;
	const usesExternalEngine = Boolean(engineProp);
	const disabled = readOnly || engine.readOnly;
	const workflow = useMemo(
		() => readWorkflowFromFormData(engine.formData),
		[engine.formData],
	);

	const resolvedModalBindings = useMemo(
		() =>
			modalBindingsProp ??
			resolveAnketaFormModalBindingSets(
				engine.previewSchema as Record<string, unknown>,
				engine.previewUiSchema as Record<string, unknown>,
			),
		[engine.previewSchema, engine.previewUiSchema, modalBindingsProp],
	);
	const modalBindings = resolvedModalBindings;

	const effectiveHiddenRootKeys = useMemo(() => {
		const fromSchema = new Set(modalBindings.hiddenRootKeys);
		for (const key of hiddenTopLevelFields) fromSchema.add(key);
		return [...fromSchema];
	}, [modalBindings.hiddenRootKeys, hiddenTopLevelFields]);

	const formUiSchema = useMemo(() => {
		let ui = withHiddenTopLevelFields(
			engine.previewUiSchema,
			effectiveHiddenRootKeys,
		);
		ui = withCompactArrayFields(ui, modalBindings.compactArrayTablePathSet);
		ui = withHiddenArchModalFields(
			ui,
			engine.previewSchema,
			modalBindings.bindings,
		);
		ui = applySectionLocksToUiSchema(ui, workflow);
		return {
			...ui,
			"ui:submitButtonOptions": { norender: true },
		};
	}, [
		engine.previewUiSchema,
		engine.previewSchema,
		effectiveHiddenRootKeys,
		modalBindings,
		workflow,
	]);

	const handleToggleGroupActivation = useCallback(
		(pathKey: string, active: boolean) => {
			engine.setFormData(
				setGroupActivationAtPath(engine.formData, pathKey, active),
			);
		},
		[engine],
	);

	const devCalculationInfluence = useMemo(() => {
		if (!IS_DEV) return undefined;
		const map = buildCalculationInfluenceByPath(
			engine.calculationItems ?? [],
			engine.taskTriggerItems ?? [],
			engine.logicRules ?? [],
		);
		attachTypicalWorkRowInfluence(
			map,
			engine.calculationLiveFormData,
			collectGeneratedTypicalWorkArrayPaths(engine.previewUiSchema),
		);
		return map;
	}, [
		engine.calculationItems,
		engine.taskTriggerItems,
		engine.logicRules,
		engine.calculationLiveFormData,
		engine.previewUiSchema,
	]);

	const formContext = useMemo((): AnketaFormContextValue => {
		const base = anketaFormContext ?? {};
		return mergeAnketaFormContext(base, {
			formData: engine.displayFormData,
			previewSchema: engine.previewSchema,
			previewUiSchema: engine.previewUiSchema,
			workflow,
			anketaModalObjectPaths:
				base.anketaModalObjectPaths ?? modalBindings.modalObjectPathSet,
			anketaModalArrayPaths:
				base.anketaModalArrayPaths ?? modalBindings.modalArrayPathSet,
			anketaCompactArrayTablePaths:
				base.anketaCompactArrayTablePaths ??
				modalBindings.compactArrayTablePathSet,
			anketaReadOnly: readOnly || base.anketaReadOnly,
			schemaEditorPreview:
				base.schemaEditorPreview ?? engine.version?.id === "editor-draft",
			onToggleGroupActivation:
				base.onToggleGroupActivation ??
				(disabled ? undefined : handleToggleGroupActivation),
			devCalculationInfluence,
			devCalculationItems: IS_DEV ? engine.calculationItems : undefined,
			devTaskTriggerItems: IS_DEV ? engine.taskTriggerItems : undefined,
			devCalculationLoading: IS_DEV ? engine.calculationLoading : undefined,
			calculationLoading: engine.calculationLoading,
		});
	}, [
		anketaFormContext,
		readOnly,
		disabled,
		handleToggleGroupActivation,
		engine.displayFormData,
		engine.version?.id,
		engine.calculationItems,
		engine.taskTriggerItems,
		engine.calculationLoading,
		devCalculationInfluence,
		modalBindings,
		workflow,
	]);

	const rjsfFormData = useMemo(
		() => normalizeAnketaFormDataForRjsf(engine.displayFormData),
		[engine.displayFormData],
	);

	const visibleRootFieldCount = useMemo(() => {
		const props = engine.previewSchema.properties ?? {};
		const formUi = formUiSchema as Record<string, unknown>;
		return Object.keys(props).filter((key) => {
			if (effectiveHiddenRootKeys.includes(key)) return false;
			return !isV2AnketaHiddenUiNode(formUi[key]);
		}).length;
	}, [engine.previewSchema.properties, effectiveHiddenRootKeys, formUiSchema]);

	if (!usesExternalEngine && !source?.templateId) {
		return (
			<FormNotice testId={`${dataTestId}--no-source`}>
				Не задан шаблон схемы
			</FormNotice>
		);
	}

	if (!usesExternalEngine && !engine.version?.id) {
		return (
			<FormNotice color="warning.main" testId={`${dataTestId}--no-version`}>
				Нет версии схемы для отображения формы
			</FormNotice>
		);
	}

	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				width: "100%",
				minWidth: 0,
			}}
		>
			{engine.calculationError ? (
				<FormNotice color="error.main">
					Ошибка калькуляции: {engine.calculationError}
				</FormNotice>
			) : null}

			{engine.logicValidationIssueCount > 0 ? (
				<FormNotice color="warning.main">
					Логическая валидация: {engine.logicValidationIssueCount}{" "}
					{engine.logicValidationIssueCount === 1 ? "замечание" : "замечаний"}
				</FormNotice>
			) : null}

			{visibleRootFieldCount === 0 ? (
				<FormNotice testId={`${dataTestId}--empty-schema`}>
					В схеме нет полей для отображения. Добавьте секции в редакторе или
					создайте схему из заводского эталона.
				</FormNotice>
			) : null}

			<Form
				key={formRemountKey ?? 0}
				schema={engine.previewSchema}
				uiSchema={formUiSchema}
				formData={rjsfFormData}
				extraErrors={engine.logicExtraErrors}
				templates={v2AnketaFormTemplates}
				widgets={v2AnketaFormWidgets}
				validator={validatorRu}
				liveValidate
				noHtml5Validate
				showErrorList={false}
				disabled={disabled}
				readonly={disabled}
				formContext={formContext}
				onChange={(evt) => {
					const rjsfNext = (evt.formData as Record<string, unknown>) ?? {};
					const next = applyRjsfFormChangeToAnketaFormData(
						engine.formData,
						rjsfNext,
						engine.previewUiSchema as Record<string, unknown>,
					);
					const touchedId = resolveTouchedMainSection(evt);
					const withWorkflowTouch =
						touchedId != null ? touchSectionInFormData(next, touchedId) : next;
					engine.setFormData(withWorkflowTouch);
				}}
			/>
		</Box>
	);
}

export function useV2AnketaSchemaFormEngine(
	source: V2AnketaSchemaEngineSource | null,
) {
	return useV2AnketaSchemaEngine(source);
}

function resolveTouchedMainSection(evt: {
	id?: string;
	schema?: unknown;
}): V2AnketaMainSectionId | null {
	const id = evt.id ?? "";
	const match = id.match(
		/^root_(generalInfo|detailInfo|streamDataSources|streamModelControl)/,
	);
	return (match?.[1] as V2AnketaMainSectionId | undefined) ?? null;
}
