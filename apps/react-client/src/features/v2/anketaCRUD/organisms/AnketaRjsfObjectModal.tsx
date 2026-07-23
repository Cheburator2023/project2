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
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { v2AnketaFormTemplates } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormTemplates";
import { v2AnketaFormWidgets } from "@react-client/features/v2/admin_constructor/templates/v2PreviewFormWidgets";
import {
	createAnketaModalCustomValidate,
	isAnketaModalFormValid,
	omitUnsetOptionalFields,
} from "../utils/anketaModalFormValidation.util";
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

	const customValidate = useMemo(
		() => createAnketaModalCustomValidate(formSchema),
		[formSchema],
	);

	const formKey = useMemo(
		() => JSON.stringify({ schema: formSchema, uiSchema: formUiSchema }),
		[formSchema, formUiSchema],
	);

	// Снимок значений берём только при открытии модалки. Иначе перерендер
	// родителя (новый ref defaultValues) затирал бы текущие правки пользователя.
	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			const initial = omitUnsetOptionalFields(defaultValues ?? {}, formSchema);
			setFormData(transformFormData ? transformFormData(initial) : initial);
		}
		wasOpenRef.current = open;
	}, [open, defaultValues, transformFormData, formSchema]);

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
						key={formKey}
						schema={formSchema}
						uiSchema={formUiSchema}
						formData={formData}
						customValidate={customValidate}
						templates={v2AnketaFormTemplates}
						widgets={v2AnketaFormWidgets}
						validator={validatorRu}
						liveValidate
						noHtml5Validate
						showErrorList={false}
						onChange={(evt) => {
							const raw = (evt.formData as Record<string, unknown>) ?? {};
							const cleaned = omitUnsetOptionalFields(raw, formSchema);
							setFormData(
								transformFormData ? transformFormData(cleaned) : cleaned,
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
					onClick={() => {
						if (!canSave) return;
						onSubmit(omitUnsetOptionalFields(formData, formSchema));
					}}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
