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
import { useEffect, useMemo, useState } from "react";

type Props = {
	open: boolean;
	title: string;
	schema: RJSFSchema;
	uiSchema: UiSchema;
	defaultValues?: Record<string, unknown>;
	onClose: () => void;
	onSubmit: (values: Record<string, unknown>) => void;
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
}: Props) {
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	const formSchema = useMemo((): RJSFSchema => {
		const { title: _title, ...rest } = schema;
		return { ...rest, type: "object" };
	}, [schema]);

	const formUiSchema = useMemo(
		() => modalRootUiSchema(uiSchema),
		[uiSchema],
	);

	const formKey = useMemo(
		() => JSON.stringify({ schema: formSchema, uiSchema: formUiSchema }),
		[formSchema, formUiSchema],
	);

	useEffect(() => {
		if (!open) return;
		setFormData(defaultValues ?? {});
	}, [open, defaultValues]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
			<DialogContent dividers>
				<Box sx={{ pt: 0.5 }}>
					<Form
						key={formKey}
						schema={formSchema}
						uiSchema={formUiSchema}
						formData={formData}
						validator={validatorRu}
						liveValidate
						noHtml5Validate
						showErrorList={false}
						onChange={(evt) =>
							setFormData(
								(evt.formData as Record<string, unknown>) ?? {},
							)
						}
					/>
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button variant="outlined" onClick={onClose}>
					Отмена
				</Button>
				<Button
					variant="contained"
					onClick={() => onSubmit(formData)}
					sx={{ textTransform: "uppercase", fontWeight: 600 }}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
