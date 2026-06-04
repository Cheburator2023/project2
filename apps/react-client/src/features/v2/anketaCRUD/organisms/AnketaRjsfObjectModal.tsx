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
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	title: string;
	schema: RJSFSchema;
	uiSchema: UiSchema;
	defaultValues?: Record<string, unknown>;
	onClose: () => void;
	onSubmit: (values: Record<string, unknown>) => void;
};

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
					onClick={onClose}
					sx={{ position: "absolute", right: 8, top: 8 }}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				<Box sx={{ pt: 0.5 }}>
					<Form
						schema={schema}
						uiSchema={{
							...uiSchema,
							"ui:submitButtonOptions": { norender: true },
						}}
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
