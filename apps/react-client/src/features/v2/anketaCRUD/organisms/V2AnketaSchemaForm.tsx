import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Form from "@rjsf/mui";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { v2PreviewFormTemplates } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormTemplates";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import { useMemo } from "react";

const BINDING_SEVERITY: Record<
	V2SchemaBindingDto["status"],
	"success" | "warning" | "error"
> = {
	aligned: "success",
	superseded: "warning",
	unavailable: "error",
};

type Props = {
	source: V2AnketaSchemaEngineSource | null;
	engine?: ReturnType<typeof useV2AnketaSchemaEngine>;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	"data-test-id"?: string;
};

export function V2AnketaSchemaForm({
	source,
	engine: engineProp,
	schemaBinding,
	readOnly = false,
	"data-test-id": dataTestId = "v2-anketa-schema-form",
}: Props) {
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const disabled = readOnly || engine.readOnly;
	const formUiSchema = useMemo(
		() => ({
			...engine.previewUiSchema,
			"ui:submitButtonOptions": { norender: true },
		}),
		[engine.previewUiSchema],
	);

	if (!source?.templateId) {
		return (
			<Alert severity="info" data-test-id={`${dataTestId}--no-source`}>
				Не задан шаблон схемы
			</Alert>
		);
	}

	if (engine.versionLoading) {
		return (
			<Box
				sx={{ display: "flex", justifyContent: "center", py: 4 }}
				data-test-id={`${dataTestId}--loading`}
			>
				<CircularProgress size={32} />
			</Box>
		);
	}

	if (!engine.version?.id) {
		return (
			<Alert severity="warning" data-test-id={`${dataTestId}--no-version`}>
				Нет версии схемы для отображения формы
			</Alert>
		);
	}

	return (
		<Box data-test-id={dataTestId} sx={{ width: "100%", minWidth: 0 }}>
			{schemaBinding ? (
				<Alert
					severity={BINDING_SEVERITY[schemaBinding.status]}
					sx={{ mb: 2 }}
					data-test-id={`${dataTestId}--schema-binding`}
				>
					{schemaBinding.message}
				</Alert>
			) : null}

			{engine.dictionaryEnumsLoading ? (
				<Alert severity="info" sx={{ mb: 2 }}>
					Загрузка справочников…
				</Alert>
			) : null}

			{engine.calculationError ? (
				<Alert severity="error" sx={{ mb: 2 }}>
					Ошибка калькуляции: {engine.calculationError}
				</Alert>
			) : null}

			{engine.logicValidationIssueCount > 0 ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Логическая валидация: {engine.logicValidationIssueCount}{" "}
					{engine.logicValidationIssueCount === 1 ? "замечание" : "замечаний"}
				</Alert>
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
				onChange={(evt) =>
					engine.setFormData((evt.formData as Record<string, unknown>) ?? {})
				}
			/>
		</Box>
	);
}

export function useV2AnketaSchemaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
