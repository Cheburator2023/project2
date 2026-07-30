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
import { isAnketaArchPathReadOnly } from "../utils/anketaPathLock.util";
import {
	resolveObjectTableColumns,
} from "../utils/anketaArchObjectTableConfig";
import {
	archObjectListRowLabel,
	canAppendArchObjectListItem,
	readArchObjectListAtPath,
} from "../utils/anketaArchObjectListPaths";

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
	const formData = ctx.formData ?? {};
	const items = readArchObjectListAtPath(formData, pathKey);
	const readOnly = isAnketaArchPathReadOnly(formContext, pathKey);
	const showAddButton =
		!readOnly && canAppendArchObjectListItem(formData, pathKey);

	const addLabel = `Добавить ${sectionTitle.toLowerCase()}`;
	const panelTestId = anketaMoleculeTestIdForPath(
		ANKETA_MOLECULE_TEST_IDS.archObjectPanel,
		pathKey,
	);

	const rowActionsWidth = readOnly ? "" : " 72px";
	const rowGridColumns = columns
		? `repeat(${columns.length}, 1fr)${rowActionsWidth}`
		: `1fr${rowActionsWidth}`;

	const rowActions = (index: number) =>
		readOnly ? null : (
			<Stack direction="row" spacing={0.25} justifyContent="flex-end">
				<IconButton
					size="small"
					title="Редактировать"
					data-test-id={`${panelTestId}--edit-${index}`}
					onClick={() => ctx.openAnketaModal?.(pathKey, index)}
				>
					<EditOutlinedIcon fontSize="small" />
				</IconButton>
				<IconButton
					size="small"
					title="Удалить"
					data-test-id={`${panelTestId}--delete-${index}`}
					onClick={() => ctx.deleteAnketaArrayItem?.(pathKey, index)}
				>
					<DeleteOutlineIcon fontSize="small" />
				</IconButton>
			</Stack>
		);

	return (
		<Box data-test-id={panelTestId} sx={{ minWidth: 0 }}>
			{items.length > 0 ? (
				<Stack spacing={1}>
					{items.map((item, index) => (
						<Box
							key={`${pathKey}-${index}`}
							data-test-id={`${panelTestId}--row-${index}`}
							sx={{
								display: "grid",
								gridTemplateColumns: rowGridColumns,
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
									{archObjectListRowLabel(item, columns, index)}
								</Typography>
							)}
							{rowActions(index)}
						</Box>
					))}
				</Stack>
			) : (
				<ListEmptyPlaceholder data-test-id={`${panelTestId}--empty`}>
					Нет записей
				</ListEmptyPlaceholder>
			)}
			{showAddButton ? (
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
