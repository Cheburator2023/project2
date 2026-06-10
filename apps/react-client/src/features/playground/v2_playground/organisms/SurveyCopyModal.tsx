import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	Radio,
	RadioGroup,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

export type SurveyCopyMode = "new_version" | "copy";

export type SurveyCopyFormValues = {
	mode: SurveyCopyMode;
	surveyName: string;
};

type SurveyCopyModalProps = {
	open: boolean;
	onClose: () => void;
	onSubmit: (values: SurveyCopyFormValues) => void;
	loading?: boolean;
	defaultValues?: Partial<SurveyCopyFormValues>;
};

const INITIAL_VALUES: SurveyCopyFormValues = {
	mode: "new_version",
	surveyName: "",
};

export const SurveyCopyModal = ({
	open,
	onClose,
	onSubmit,
	loading = false,
	defaultValues,
}: SurveyCopyModalProps) => {
	const [values, setValues] = useState<SurveyCopyFormValues>({
		...INITIAL_VALUES,
		...defaultValues,
	});

	const isCopyMode = values.mode === "copy";

	const handleSubmit = () => {
		onSubmit(values);
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
				<Stack
					direction="row"
					alignItems="center"
					justifyContent="space-between"
				>
					<Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
						Копирование анкеты
					</Typography>
					<IconButton onClick={onClose} size="small" aria-label="Закрыть">
						<CloseIcon />
					</IconButton>
				</Stack>
			</DialogTitle>

			<DialogContent sx={{ px: 3, py: 1 }}>
				<Stack spacing={1.5}>
					<RadioGroup
						value={values.mode}
						onChange={(event) =>
							setValues((prev) => ({
								...prev,
								mode: event.target.value as SurveyCopyMode,
							}))
						}
					>
						<FormControlLabel
							value="new_version"
							control={<Radio />}
							label="Создать новую версию анкеты"
						/>
						<FormControlLabel
							value="copy"
							control={<Radio />}
							label="Скопировать анкету"
						/>
					</RadioGroup>

					{isCopyMode && (
						<TextField
							fullWidth
							label="Наименование анкеты"
							value={values.surveyName}
							onChange={(event) =>
								setValues((prev) => ({
									...prev,
									surveyName: event.target.value,
								}))
							}
						/>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2.5 }}>
				<Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
					<Button
						onClick={onClose}
						variant="text"
						color="primary"
						disabled={loading}
					>
						Отмена
					</Button>
					<Button
						onClick={handleSubmit}
						variant="contained"
						color="primary"
						disabled={loading}
					>
						{loading ? "Сохранение…" : "Сохранить"}
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
};
