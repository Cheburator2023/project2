import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ListEmptyPlaceholder } from "./ListEmptyPlaceholder";
import {
	ANKETA_MOLECULE_TEST_IDS,
	anketaMoleculeTestIdForPath,
} from "./testIds";
import { readAnketaFormContext } from "../utils/anketaFormContext";
import {
	getObjectAtPath,
	isArchObjectFilled,
	resolveObjectTableColumns,
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
	const columns = resolveObjectTableColumns(
		pathKey,
		ctx.previewSchema,
		ctx.previewUiSchema,
	);
	const item = getObjectAtPath(ctx.formData ?? {}, pathKey);
	const filled = isArchObjectFilled(item);
	const readOnly = ctx.anketaReadOnly;

	const addLabel = `Добавить ${sectionTitle.toLowerCase()}`;
	const panelTestId = anketaMoleculeTestIdForPath(
		ANKETA_MOLECULE_TEST_IDS.archObjectPanel,
		pathKey,
	);

	const rowActions = (
		<Stack direction="row" spacing={0.25} justifyContent="flex-end">
			<IconButton
				size="small"
				disabled={readOnly}
				title="Редактировать"
				data-test-id={`${panelTestId}--edit`}
				onClick={() => ctx.openAnketaModal?.(pathKey)}
			>
				<EditOutlinedIcon fontSize="small" />
			</IconButton>
			<IconButton
				size="small"
				disabled={readOnly}
				title="Удалить"
				data-test-id={`${panelTestId}--delete`}
				onClick={() => ctx.deleteAnketaObject?.(pathKey)}
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Stack>
	);

	return (
		<Box data-test-id={panelTestId} sx={{ minWidth: 0 }}>
			{filled ? (
				<Box
					data-test-id={`${panelTestId}--row`}
					sx={{
						display: "grid",
						gridTemplateColumns: columns
							? `repeat(${columns.length}, 1fr) 72px`
							: "1fr 72px",
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
					{columns ? (
						columns.map((column) => (
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
						))
					) : (
						<Typography variant="body2" color="text.secondary">
							Заполнено
						</Typography>
					)}
					{rowActions}
				</Box>
			) : (
				<ListEmptyPlaceholder data-test-id={`${panelTestId}--empty`}>
					Нет записей
				</ListEmptyPlaceholder>
			)}
			{!readOnly ? (
				<Box mt={2} data-test-id={`${panelTestId}--add-wrap`}>
					<Button
						variant="outlined"
						startIcon={<AddIcon />}
						data-test-id={`${panelTestId}--add`}
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
