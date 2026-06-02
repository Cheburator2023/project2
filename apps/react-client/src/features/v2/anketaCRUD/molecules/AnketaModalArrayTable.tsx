import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { readAnketaFormContext } from "../utils/anketaFormContext";
import {
	getArrayAtPath,
	getArrayTableColumns,
	type AnketaArrayTableColumn,
} from "../utils/anketaModalArrayTableConfig";

type Props = {
	pathKey: string;
	sectionTitle: string;
};

function gridTemplate(columns: AnketaArrayTableColumn[]): string {
	return `${columns.map((col) => col.width ?? "1fr").join(" ")} 72px`;
}

function CellValue({
	column,
	value,
}: {
	column: AnketaArrayTableColumn;
	value: string;
}) {
	if (column.chip && value !== "—") {
		return (
			<Chip
				size="small"
				label={value.length > 28 ? `${value.slice(0, 25)}…` : value}
				sx={{
					maxWidth: "100%",
					bgcolor: "grey.100",
					fontFamily: "monospace",
					fontSize: 12,
				}}
			/>
		);
	}

	if (column.link && value !== "—") {
		return (
			<Stack direction="row" spacing={0.5} alignItems="center" minWidth={0}>
				<Typography
					variant="body2"
					sx={{
						color: "primary.main",
						fontWeight: 500,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{value}
				</Typography>
				<OpenInNewIcon sx={{ fontSize: 16, color: "primary.main", flexShrink: 0 }} />
			</Stack>
		);
	}

	return (
		<Typography
			variant="body2"
			color={value === "—" ? "text.disabled" : "text.primary"}
			sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
		>
			{value}
		</Typography>
	);
}

export function AnketaModalArrayTable({
	pathKey,
	sectionTitle,
	formContext,
}: Props & { formContext: unknown }) {
	const ctx = readAnketaFormContext(formContext);
	const columns = getArrayTableColumns(pathKey);
	const items = getArrayAtPath(ctx.formData ?? {}, pathKey);
	const readOnly = ctx.anketaReadOnly;

	if (!columns) return null;

	return (
		<Box sx={{ minWidth: 0 }}>
			<Stack direction="row" spacing={0.75} alignItems="baseline" mb={1.5}>
				<Typography variant="subtitle1" fontWeight={700}>
					{sectionTitle}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					({items.length})
				</Typography>
			</Stack>

			{items.length > 0 ? (
				<Box sx={{ minWidth: 0, overflowX: "auto" }}>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: gridTemplate(columns),
							gap: 1,
							px: 1.5,
							py: 0.75,
							minWidth: 720,
						}}
					>
						{columns.map((column) => (
							<Typography
								key={column.key}
								variant="caption"
								color="text.secondary"
								sx={{ fontWeight: 500 }}
							>
								{column.header}
							</Typography>
						))}
						<Box />
					</Box>

					<Stack spacing={1} sx={{ minWidth: 720 }}>
						{items.map((item, index) => (
							<Box
								key={`${pathKey}-${index}`}
								sx={{
									display: "grid",
									gridTemplateColumns: gridTemplate(columns),
									gap: 1,
									alignItems: "center",
									px: 1.5,
									py: 1.25,
									bgcolor: "grey.50",
									borderRadius: 1.5,
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								{columns.map((column) => (
									<CellValue
										key={column.key}
										column={column}
										value={
											column.render
												? column.render(item)
												: String(item[column.field ?? column.key] ?? "—")
										}
									/>
								))}
								<Stack direction="row" spacing={0.25} justifyContent="flex-end">
									<IconButton
										size="small"
										disabled={readOnly}
										title="Редактировать"
										onClick={() => ctx.openAnketaModal?.(pathKey, index)}
									>
										<EditOutlinedIcon fontSize="small" />
									</IconButton>
									<IconButton
										size="small"
										disabled={readOnly}
										title="Удалить"
										onClick={() =>
											ctx.deleteAnketaArrayItem?.(pathKey, index)
										}
									>
										<DeleteOutlineIcon fontSize="small" />
									</IconButton>
								</Stack>
							</Box>
						))}
					</Stack>
				</Box>
			) : (
				<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
					Нет записей
				</Typography>
			)}
		</Box>
	);
}
