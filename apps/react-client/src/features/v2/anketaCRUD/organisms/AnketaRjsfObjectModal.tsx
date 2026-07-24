import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
} from "@mui/material";
import Form from "@rjsf/mui";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { toast } from "@react-client/common/toasts";
import { v2AnketaFormTemplates } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormTemplates";
import { v2AnketaFormWidgets } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormWidgets";
import {
	collectRequiredFieldKeys,
	isAnketaModalFormValid,
	isFilledRequiredValue,
	omitUnsetOptionalFields,
} from "../utils/anketaModalFormValidation.util";
import { anketaModalNoAjvValidator } from "../utils/anketaModalNoAjvValidator";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
	open: boolean;
	title: string;
	schema: RJSFSchema;
	uiSchema: UiSchema;
	defaultValues?: Record<string, unknown>;
	onClose: () => void;
	onSubmit: (values: Record<string, unknown>) => void;
	/** Пересчёт производных полей при каждом изменении (напр. итог нетиповой работы). */
	transformFormData?: (data: Record<string, unknown>) => Record<string, unknown>;
};

/** uiSchema для модалки: без повторного заголовка корневого object (есть DialogTitle). */
function modalRootUiSchema(uiSchema: UiSchema): UiSchema {
	const baseOptions =
		uiSchema["ui:options"] &&
		typeof uiSchema["ui:options"] === "object" &&
		!Array.isArray(uiSchema["ui:options"])
			? (uiSchema["ui:options"] as Record<string, unknown>)
			: {};
	return {
		...uiSchema,
		"ui:title": "",
		"ui:options": { ...baseOptions, label: false },
		"ui:submitButtonOptions": { norender: true },
	};
}

function missingRequiredLabels(
	formData: Record<string, unknown>,
	schema: RJSFSchema,
): string[] {
	const props = schema.properties;
	const propMap =
		props && typeof props === "object" && !Array.isArray(props)
			? (props as Record<string, RJSFSchema>)
			: {};
	return collectRequiredFieldKeys(schema)
		.filter((key) => !isFilledRequiredValue(formData[key]))
		.map((key) => {
			const title = propMap[key]?.title;
			return typeof title === "string" && title.trim() ? title : key;
		});
}

export function AnketaRjsfObjectModal({
	open,
	title,
	schema,
	uiSchema,
	defaultValues,
	onClose,
	onSubmit,
	transformFormData,
}: Props) {
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	const formSchema = useMemo((): RJSFSchema => {
		const { title: _title, ...rest } = schema;
		return { ...rest, type: "object" };
	}, [schema]);

	const formUiSchema = useMemo(() => modalRootUiSchema(uiSchema), [uiSchema]);

	const canSave = useMemo(
		() => isAnketaModalFormValid(formData, formSchema, formUiSchema),
		[formData, formSchema, formUiSchema],
	);

	// Remount только при новом открытии — не при подгрузке справочников.
	const [formSession, setFormSession] = useState(0);
	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			setFormSession((n) => n + 1);
			const initial = { ...(defaultValues ?? {}) };
			setFormData(transformFormData ? transformFormData(initial) : initial);
		}
		wasOpenRef.current = open;
	}, [open, defaultValues, transformFormData]);

	const handleSave = () => {
		if (!canSave) {
			const missing = missingRequiredLabels(formData, formSchema);
			toast.error(
				missing.length
					? `Заполните: ${missing.join(", ")}`
					: "Заполните обязательные поля",
			);
			return;
		}
		onSubmit(omitUnsetOptionalFields(formData, formSchema));
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			scroll="paper"
			PaperProps={{
				sx: {
					maxHeight: "calc(100vh - 66px)",
					display: "flex",
					flexDirection: "column",
				},
			}}
		>
			<DialogTitle sx={{ pr: 6 }}>
				{title}
				<IconButton
					aria-label="Закрыть"
					title="Закрыть"
					onClick={onClose}
					sx={{ position: "absolute", right: 8, top: 8 }}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
				<Box sx={{ pt: 0.5 }}>
					<Form
						key={`anketa-rjsf-modal-${formSession}`}
						schema={formSchema}
						uiSchema={formUiSchema}
						formData={formData}
						templates={v2AnketaFormTemplates}
						widgets={v2AnketaFormWidgets}
						validator={anketaModalNoAjvValidator}
						liveValidate={false}
						noHtml5Validate
						showErrorList={false}
						formContext={{ debouncePreviewInputs: false }}
						onChange={(evt) => {
							const raw = (evt.formData as Record<string, unknown>) ?? {};
							setFormData(
								transformFormData ? transformFormData(raw) : raw,
							);
						}}
					/>
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button variant="outlined" onClick={onClose}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!canSave}
					onClick={handleSave}
					title={
						canSave ? undefined : "Заполните обязательные поля"
					}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
