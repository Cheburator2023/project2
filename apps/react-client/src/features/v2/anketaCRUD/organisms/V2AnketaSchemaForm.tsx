import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Form from "@rjsf/mui";
import type { UiSchema } from "@rjsf/utils";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { v2PreviewFormTemplates } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormTemplates";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { ANKETA_MODAL_ARRAY_PATHS } from "../utils/anketaFormModalPaths";
import { applySectionLocksToUiSchema } from "../utils/anketaSectionUiSchema";
import { readWorkflowFromFormData, touchSectionInFormData } from "../hooks/useAnketaWorkflow";
import type { V2AnketaMainSectionId } from "@smart-anketa/api-contract";
import type { ReactNode } from "react";
import { useMemo } from "react";

const BINDING_TEXT_COLOR: Record<
	V2SchemaBindingDto["status"],
	"success.main" | "warning.main" | "error.main"
> = {
	aligned: "success.main",
	superseded: "warning.main",
	unavailable: "error.main",
};

type Props = {
	source: V2AnketaSchemaEngineSource | null;
	engine?: ReturnType<typeof useV2AnketaSchemaEngine>;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	hiddenTopLevelFields?: string[];
	anketaFormContext?: AnketaFormContextValue;
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

function withModalArrayFields(uiSchema: UiSchema): UiSchema {
	let next = uiSchema;
	for (const path of ANKETA_MODAL_ARRAY_PATHS) {
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
	schemaBinding,
	readOnly = false,
	hiddenTopLevelFields = [],
	anketaFormContext,
	"data-test-id": dataTestId = "v2-anketa-schema-form",
}: Props) {
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const disabled = readOnly || engine.readOnly;
	const workflow = useMemo(
		() => readWorkflowFromFormData(engine.formData),
		[engine.formData],
	);

	const formUiSchema = useMemo(() => {
		let ui = withHiddenTopLevelFields(
			engine.previewUiSchema,
			hiddenTopLevelFields,
		);
		ui = withModalArrayFields(ui);
		ui = applySectionLocksToUiSchema(ui, workflow);
		return {
			...ui,
			"ui:submitButtonOptions": { norender: true },
		};
	}, [engine.previewUiSchema, hiddenTopLevelFields, workflow]);

	const formContext = useMemo(
		(): AnketaFormContextValue => ({
			...anketaFormContext,
			formData:
				anketaFormContext?.formData ?? engine.displayFormData,
			anketaModalArrayPaths:
				anketaFormContext?.anketaModalArrayPaths ??
				new Set(ANKETA_MODAL_ARRAY_PATHS),
			anketaReadOnly: readOnly || anketaFormContext?.anketaReadOnly,
		}),
		[anketaFormContext, readOnly, engine.displayFormData],
	);

	if (!source?.templateId) {
		return (
			<FormNotice testId={`${dataTestId}--no-source`}>
				Не задан шаблон схемы
			</FormNotice>
		);
	}

	if (!engine.version?.id) {
		return (
			<FormNotice
				color="warning.main"
				testId={`${dataTestId}--no-version`}
			>
				Нет версии схемы для отображения формы
			</FormNotice>
		);
	}

	return (
		<Box data-test-id={dataTestId} sx={{ width: "100%", minWidth: 0 }}>
			{schemaBinding ? (
				<FormNotice
					color={BINDING_TEXT_COLOR[schemaBinding.status]}
					testId={`${dataTestId}--schema-binding`}
				>
					{schemaBinding.message}
				</FormNotice>
			) : null}

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

			<Form
				schema={engine.previewSchema}
				uiSchema={formUiSchema}
				formData={engine.displayFormData}
				extraErrors={engine.logicExtraErrors}
				templates={v2PreviewFormTemplates}
				validator={validatorRu}
				liveValidate
				noHtml5Validate
				showErrorList={false}
				disabled={disabled}
				readonly={disabled}
				formContext={formContext}
				onChange={(evt) => {
					const next = (evt.formData as Record<string, unknown>) ?? {};
					const touchedId = resolveTouchedMainSection(evt);
					const withWorkflowTouch =
						touchedId != null
							? touchSectionInFormData(next, touchedId)
							: next;
					engine.setFormData(withWorkflowTouch);
				}}
			/>
		</Box>
	);
}

export function useV2AnketaSchemaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}

function resolveTouchedMainSection(evt: {
	id?: string;
	schema?: unknown;
}): V2AnketaMainSectionId | null {
	const id = evt.id ?? "";
	const match = id.match(
		/^root_(generalInfo|detailInfo|streamDataSources|streamMlPlatform|streamModelControl)/,
	);
	return (match?.[1] as V2AnketaMainSectionId | undefined) ?? null;
}
