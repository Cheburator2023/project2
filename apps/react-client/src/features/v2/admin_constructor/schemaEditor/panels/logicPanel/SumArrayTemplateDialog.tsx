import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import type { RJSFSchema } from "@rjsf/utils";
import { useEffect, useMemo, useState } from "react";
import {
	buildSumArrayReduce,
	listArrayItemNumericFields,
	listArrayPathOptions,
} from "./jsonLogicTemplates";

type Props = {
	open: boolean;
	jsonSchema: RJSFSchema;
	onClose: () => void;
	onApply: (condition: ReturnType<typeof buildSumArrayReduce>) => void;
};

export function SumArrayTemplateDialog({
	open,
	jsonSchema,
	onClose,
	onApply,
}: Props) {
	const arrayOptions = useMemo(
		() => listArrayPathOptions(jsonSchema),
		[jsonSchema],
	);

	const [arrayVarPath, setArrayVarPath] = useState("");
	const [rowField, setRowField] = useState("total");

	const selectedArray = arrayOptions.find((o) => o.varPath === arrayVarPath);

	const rowFieldOptions = useMemo(() => {
		if (!selectedArray) return ["total"];
		const fields = listArrayItemNumericFields(
			jsonSchema,
			selectedArray.pointer,
		);
		return fields.length > 0 ? fields : ["total"];
	}, [jsonSchema, selectedArray]);

	useEffect(() => {
		if (!open) return;
		if (!arrayVarPath && arrayOptions[0]) {
			setArrayVarPath(arrayOptions[0].varPath);
		}
	}, [open, arrayVarPath, arrayOptions]);

	useEffect(() => {
		if (rowFieldOptions.includes(rowField)) return;
		setRowField(rowFieldOptions[0] ?? "total");
	}, [rowField, rowFieldOptions]);

	const handleApply = () => {
		const path = arrayVarPath.trim();
		const field = rowField.trim();
		if (!path || !field) return;
		onApply(buildSumArrayReduce(path, field));
		onClose();
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>Сумма по массиву (reduce)</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
				{arrayOptions.length === 0 ? (
					<TextField
						size="small"
						label="Путь к массиву (var)"
						fullWidth
						value={arrayVarPath}
						onChange={(e) => setArrayVarPath(e.target.value)}
						placeholder="mlPlatform.typicalTasks"
						helperText="В схеме нет полей type=array — укажите путь вручную."
					/>
				) : (
					<Autocomplete
						size="small"
						options={arrayOptions}
						value={selectedArray ?? null}
						onChange={(_e, opt) => setArrayVarPath(opt?.varPath ?? "")}
						getOptionLabel={(o) => o.label}
						isOptionEqualToValue={(a, b) => a.varPath === b.varPath}
						renderInput={(params) => (
							<TextField {...params} label="Массив в formData" />
						)}
					/>
				)}
				<TextField
					size="small"
					label="Поле строки"
					fullWidth
					select={rowFieldOptions.length > 0}
					value={rowField}
					onChange={(e) => setRowField(e.target.value)}
					helperText="В формуле reduce: current.<поле>. Отрицательные значения не учитываются (max 0)."
					SelectProps={rowFieldOptions.length > 0 ? { native: true } : undefined}
				>
					{rowFieldOptions.map((f) => (
						<option key={f} value={f}>
							{f}
						</option>
					))}
				</TextField>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Отмена</Button>
				<Button
					variant="contained"
					onClick={handleApply}
					disabled={!arrayVarPath.trim() || !rowField.trim()}
				>
					Вставить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
