import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type {
	V2TypicalWorkLaborArchCountDto,
	V2WorkFormulaArchCountKind,
} from "@smart-anketa/api-contract";
import {
	V2_WORK_FORMULA_ARCH_COUNT_KINDS,
	formatWorkArchCountKindLabel,
} from "@smart-anketa/api-contract";
import { Box } from "@mui/material";
import { useState } from "react";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	ArchCountCoeffStepsEditor,
	formatArchCountCoeffChipSubtitle,
} from "./ArchCountCoeffStepsEditor";

type ArchCountOption = {
	kind: V2WorkFormulaArchCountKind;
	label: string;
};

type TypicalWorkLaborArchCountSectionProps = {
	laborArchCounts: V2TypicalWorkLaborArchCountDto[];
	onChange: (next: V2TypicalWorkLaborArchCountDto[]) => void;
};

const ARCH_COUNT_FIELD_SX = {
	"& .MuiOutlinedInput-root": {
		bgcolor: "#fff",
		fontSize: 12,
	},
};

export function TypicalWorkLaborArchCountSection({
	laborArchCounts,
	onChange,
}: TypicalWorkLaborArchCountSectionProps) {
	const [pickerKey, setPickerKey] = useState(0);
	const [editIndex, setEditIndex] = useState<number | null>(null);

	const usedKinds = new Set(laborArchCounts.map((row) => row.kind));
	const editRow = editIndex != null ? laborArchCounts[editIndex] : null;

	return (
		<Box
			sx={{
				border: "1px solid #e6e8ee",
				borderRadius: "11px",
				bgcolor: "#f8fafc",
				p: "12px 13px",
				mb: 1.5,
			}}
		>
			<Typography
				sx={{ fontSize: 13.5, fontWeight: 700, color: "#1d2435", mb: 1 }}
			>
				Коэффициенты по количеству компонентов
			</Typography>
			<Typography sx={{ fontSize: 11.5, color: "#6b7484", mb: 1.1 }}>
				Без привязки к полю схемы — считается по числу арх. компонентов в анкете
				(модели, источники и т.д.). N в формуле — фактическое количество;
				условия проверяются сверху вниз, срабатывает первое подходящее.
			</Typography>

			{laborArchCounts.length > 0 ? (
				<Flex wrap="wrap" gap={2}>
					{laborArchCounts.map((row, index) => (
						<Flex key={row.kind} alignItems="center" gap={0.25}>
							<Box
								component="button"
								type="button"
								onClick={() => setEditIndex(index)}
								title={`кол-во: ${formatWorkArchCountKindLabel(row.kind)}`}
								sx={{
									display: "inline-flex",
									alignItems: "center",
									gap: 0.75,
									height: 30,
									px: 1.4,
									borderRadius: "8px",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 12,
									fontWeight: 600,
									bgcolor: "#eff6ff",
									color: "#1d4ed8",
									border: "1px solid #bfdbfe",
								}}
							>
								<span>{formatWorkArchCountKindLabel(row.kind)}</span>
								<span style={{ opacity: 0.75 }}>
									{formatArchCountCoeffChipSubtitle(row.steps)}
								</span>
							</Box>
							<IconButton
								size="small"
								aria-label="Удалить коэффициент по количеству компонентов"
								onClick={() =>
									onChange(laborArchCounts.filter((_, idx) => idx !== index))
								}
								sx={{ color: "#c2554c" }}
							>
								<DeleteOutlineIcon fontSize="small" />
							</IconButton>
						</Flex>
					))}
				</Flex>
			) : null}

			<FuzzyAutocomplete<ArchCountOption>
				key={`labor-arch-count-${pickerKey}`}
				options={V2_WORK_FORMULA_ARCH_COUNT_KINDS.filter(
					(kind) => !usedKinds.has(kind),
				).map((kind) => ({
					kind,
					label: formatWorkArchCountKindLabel(kind),
				}))}
				value={null}
				onChange={(option) => {
					if (!option) return;
					onChange([
						...laborArchCounts,
						{
							kind: option.kind,
							steps: [
								{
									count: 1,
									coefficient: 1,
									operator: "=",
									coefficientFormula: null,
								},
							],
							paramName: null,
						},
					]);
					setEditIndex(laborArchCounts.length);
					setPickerKey((key) => key + 1);
				}}
				getOptionLabel={(option) => option.label}
				getOptionValue={(option) => option.kind}
				getOptionSecondaryText={() =>
					"коэффициент в формуле зависит от числа компонентов в анкете"
				}
				label="Добавить компонент"
				placeholder="Выберите компонент…"
				emptyLabel="Выберите компонент…"
				searchPlaceholder="Поиск компонента…"
				noMatchesText="Компоненты не найдены"
				allowEmpty
				size="small"
				disabled={usedKinds.size >= V2_WORK_FORMULA_ARCH_COUNT_KINDS.length}
				textFieldSx={ARCH_COUNT_FIELD_SX}
			/>

			{editRow ? (
				<ArchCountCoeffStepsEditor
					open={editIndex != null}
					kind={editRow.kind}
					steps={editRow.steps}
					onClose={() => setEditIndex(null)}
					onSave={(steps) => {
						if (editIndex == null) return;
						onChange(
							laborArchCounts.map((row, idx) =>
								idx === editIndex ? { ...row, steps } : row,
							),
						);
						setEditIndex(null);
					}}
				/>
			) : null}
		</Box>
	);
}
