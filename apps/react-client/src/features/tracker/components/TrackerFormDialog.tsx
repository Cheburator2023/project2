import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useEffect, useState } from "react";

export type TrackerFormField = {
	name: string;
	label: string;
	type?: "text" | "number" | "select" | "multiline" | "date";
	required?: boolean;
	options?: { value: string; label: string }[];
	helperText?: string;
	/** Префикс автогенерируемого кода при создании записи */
	autoGenerate?: string;
};

type Props = {
	open: boolean;
	title: string;
	fields: TrackerFormField[];
	initialValues?: Record<string, string>;
	submitLabel?: string;
	isSubmitting?: boolean;
	onClose: () => void;
	onSubmit: (values: Record<string, string>) => void | Promise<void>;
};

export function TrackerFormDialog({
	open,
	title,
	fields,
	initialValues = {},
	submitLabel = "Сохранить",
	isSubmitting = false,
	onClose,
	onSubmit,
}: Props) {
	const [values, setValues] = useState<Record<string, string>>({});

	useEffect(() => {
		if (open) {
			const next: Record<string, string> = {};
			for (const field of fields) {
				next[field.name] = initialValues[field.name] ?? "";
			}
			setValues(next);
		}
	}, [open, fields, initialValues]);

	const canSubmit = fields
		.filter((field) => field.required)
		.every((field) => values[field.name]?.trim());

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<Flex flexDirection="column">
					{fields.map((field) => (
						<Flex key={field.name} flexDirection="column">
							<TextField
								margin="dense"
								label={field.label}
								fullWidth
								required={field.required}
								multiline={field.type === "multiline"}
								minRows={field.type === "multiline" ? 2 : undefined}
								type={
									field.type === "number"
										? "number"
										: field.type === "date"
											? "date"
											: "text"
								}
								select={field.type === "select"}
								helperText={field.helperText}
								value={values[field.name] ?? ""}
								onChange={(event) =>
									setValues((prev) => ({
										...prev,
										[field.name]: event.target.value,
									}))
								}
							>
								{field.type === "select"
									? field.options?.map((option) => (
											<MenuItem key={option.value} value={option.value}>
												{option.label}
											</MenuItem>
										))
									: null}
							</TextField>
							<Spacer />
						</Flex>
					))}
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Отмена</Button>
				<Button
					variant="contained"
					disabled={!canSubmit || isSubmitting}
					onClick={() => void onSubmit(values)}
				>
					{submitLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
