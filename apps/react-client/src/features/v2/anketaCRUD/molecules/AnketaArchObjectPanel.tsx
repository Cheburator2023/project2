import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { readAnketaFormContext } from "../utils/anketaFormContext";
import {
	getObjectAtPath,
	getObjectTableColumns,
	isArchObjectFilled,
} from "../utils/anketaArchObjectTableConfig";

type Props = {
	pathKey: string;
	sectionTitle: string;
	formContext: unknown;
};

export function AnketaArchObjectPanel({
	pathKey,
	sectionTitle,
	formContext,
}: Props) {
	const ctx = readAnketaFormContext(formContext);
	const columns = getObjectTableColumns(pathKey);
	const item = getObjectAtPath(ctx.formData ?? {}, pathKey);
	const filled = isArchObjectFilled(item);
	const readOnly = ctx.anketaReadOnly;

	if (!columns) return null;

	const addLabel = `Добавить ${sectionTitle.toLowerCase()}`;

	return (
		<Box sx={{ minWidth: 0 }}>
			{filled ? (
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: `repeat(${columns.length}, 1fr) 72px`,
						gap: 1,
						alignItems: "center",
						px: 1.5,
						py: 1.25,
						bgcolor: "grey.50",
						borderRadius: 1.5,
						border: "1px solid",
						borderColor: "divider",
						minWidth: 0,
						overflowX: "auto",
					}}
				>
					{columns.map((column) => (
						<Box key={column.key} minWidth={0}>
							<Typography variant="caption" color="text.secondary">
								{column.header}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{column.render(item)}
							</Typography>
						</Box>
					))}
					<Stack direction="row" spacing={0.25} justifyContent="flex-end">
						<IconButton
							size="small"
							disabled={readOnly}
							title="Редактировать"
							onClick={() => ctx.openAnketaModal?.(pathKey)}
						>
							<EditOutlinedIcon fontSize="small" />
						</IconButton>
						<IconButton
							size="small"
							disabled={readOnly}
							title="Удалить"
							onClick={() => ctx.deleteAnketaObject?.(pathKey)}
						>
							<DeleteOutlineIcon fontSize="small" />
						</IconButton>
					</Stack>
				</Box>
			) : (
				<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
					Нет записей
				</Typography>
			)}
			{!readOnly ? (
				<Box mt={2}>
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						onClick={() => ctx.openAnketaModal?.(pathKey)}
						sx={{ textTransform: "uppercase", fontWeight: 600 }}
					>
						{addLabel}
					</Button>
				</Box>
			) : null}
		</Box>
	);
}
