import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
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
	arrayTableShowsRowActions,
	collectTypicalWorkSourceNames,
	filterTypicalWorkItems,
	getArrayAtPath,
	isTypicalWorkArrayPath,
	resolveArrayTableColumns,
	sumTypicalWorkTotals,
	type AnketaArrayTableColumn,
} from "../utils/anketaModalArrayTableConfig";
import { useMemo, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";

type Props = {
	pathKey: string;
	sectionTitle: string;
	/** Подсказка под заголовком (ui:description массива). */
	sectionHint?: string;
};

function gridTemplate(
	columns: AnketaArrayTableColumn[],
	showRowActions: boolean,
): string {
	const cols = columns.map((col) => col.width ?? "1fr").join(" ");
	return showRowActions ? `${cols} 72px` : cols;
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
				<OpenInNewIcon
					sx={{ fontSize: 16, color: "primary.main", flexShrink: 0 }}
				/>
			</Stack>
		);
	}

	return (
		<Typography
			variant="body2"
			color={value === "—" ? "text.disabled" : "text.primary"}
			sx={{
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
			}}
		>
			{value}
		</Typography>
	);
}

export function AnketaModalArrayTable({
	pathKey,
	sectionTitle,
	sectionHint,
	formContext,
}: Props & { formContext: unknown }) {
	const ctx = readAnketaFormContext(formContext);
	const columns = resolveArrayTableColumns(
		pathKey,
		ctx.previewSchema,
		ctx.previewUiSchema,
	);
	const items = getArrayAtPath(ctx.formData ?? {}, pathKey);
	const readOnly = ctx.anketaReadOnly;
	const showRowActions = arrayTableShowsRowActions(pathKey, formContext);
	const isTypicalWorks = isTypicalWorkArrayPath(pathKey);
	const sourceNames = useMemo(
		() => (isTypicalWorks ? collectTypicalWorkSourceNames(items) : []),
		[isTypicalWorks, items],
	);
	const [sourceNameFilter, setSourceNameFilter] = useState<string | null>(null);
	const visibleItems = useMemo(() => {
		if (!isTypicalWorks || sourceNames.length <= 1) return items;
		return filterTypicalWorkItems(items, sourceNameFilter);
	}, [isTypicalWorks, items, sourceNameFilter, sourceNames.length]);
	const typicalTotal = isTypicalWorks ? sumTypicalWorkTotals(visibleItems) : null;
	const displayColumns = useMemo(() => {
		if (!columns) return null;
		if (!isTypicalWorks) return columns;
		const hasSource = items.some(
			(item) =>
				typeof item.sourceName === "string" && item.sourceName.trim().length > 0,
		);
		if (hasSource) return columns;
		return columns.filter((col) => col.key !== "sourceName");
	}, [columns, isTypicalWorks, items]);

	const tableTestId = anketaMoleculeTestIdForPath(
		ANKETA_MOLECULE_TEST_IDS.arrayTable,
		pathKey,
	);

	// Fallback for paths without a column config (e.g., custom constructor schemas)
	if (!displayColumns) {
		return (
			<Box data-test-id={tableTestId} sx={{ minWidth: 0 }}>
				<Stack direction="row" spacing={0.75} alignItems="baseline" mb={1.5}>
					<Typography
						variant="subtitle1"
						fontWeight={700}
						data-test-id={ANKETA_MOLECULE_TEST_IDS.arrayTableTitle}
					>
						{sectionTitle}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						data-test-id={ANKETA_MOLECULE_TEST_IDS.arrayTableCount}
					>
						({items.length})
					</Typography>
				</Stack>
				{items.length === 0 ? (
					<ListEmptyPlaceholder>Нет записей</ListEmptyPlaceholder>
				) : (
					<Box
						sx={{
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 1.5,
							overflow: "hidden",
						}}
					>
						{items.map((item, idx) => (
							<Stack
								key={idx}
								direction="row"
								alignItems="center"
								justifyContent="space-between"
								sx={{
									px: 1.5,
									py: 1,
									borderBottom: idx < items.length - 1 ? "1px solid" : "none",
									borderColor: "divider",
								}}
							>
								<Typography variant="body2" color="text.secondary">
									{typeof item.name === "string" && item.name
										? item.name
										: `Запись ${idx + 1}`}
								</Typography>
								{showRowActions && !readOnly ? (
									<Stack direction="row" spacing={0.25}>
										<IconButton
											size="small"
											title="Редактировать"
											onClick={() => ctx.openAnketaModal?.(pathKey, idx)}
										>
											<EditOutlinedIcon fontSize="small" />
										</IconButton>
										<IconButton
											size="small"
											title="Удалить"
											onClick={() => ctx.deleteAnketaArrayItem?.(pathKey, idx)}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Stack>
								) : null}
							</Stack>
						))}
					</Box>
				)}
			</Box>
		);
	}

	return (
		<Box data-test-id={tableTestId} sx={{ minWidth: 0 }}>
			<Stack
				direction="row"
				spacing={0.75}
				alignItems="baseline"
				mb={1.5}
				data-test-id={`${tableTestId}--header`}
			>
				<Typography
					variant="subtitle1"
					fontWeight={700}
					data-test-id={ANKETA_MOLECULE_TEST_IDS.arrayTableTitle}
				>
					{sectionTitle}
				</Typography>
				<Typography
					variant="body2"
					color="text.secondary"
					data-test-id={ANKETA_MOLECULE_TEST_IDS.arrayTableCount}
				>
					({visibleItems.length}
					{visibleItems.length !== items.length ? ` из ${items.length}` : ""})
				</Typography>
			</Stack>
			{sectionHint ? (
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 1.5, whiteSpace: "pre-line" }}
					data-test-id={`${tableTestId}--hint`}
				>
					{sectionHint}
				</Typography>
			) : null}

			{isTypicalWorks && sourceNames.length > 1 ? (
				<FormControl size="small" sx={{ mb: 1.5, minWidth: 220 }}>
					<SelectWithPlaceholder
						placeholder="Объект"
						value={sourceNameFilter ?? ""}
						onChange={(e) =>
							setSourceNameFilter(
								e.target.value ? String(e.target.value) : null,
							)
						}
						renderSelected={(selected) =>
							selected ? String(selected) : "Все объекты"
						}
					>
						<MenuItem value="">Все объекты</MenuItem>
						{sourceNames.map((name) => (
							<MenuItem key={name} value={name}>
								{name}
							</MenuItem>
						))}
					</SelectWithPlaceholder>
				</FormControl>
			) : null}

			{visibleItems.length > 0 ? (
				<Box
					data-test-id={`${tableTestId}--scroll`}
					sx={{ minWidth: 0, overflowX: "auto" }}
				>
					<Box
						data-test-id={`${tableTestId}--columns-header`}
						sx={{
							display: "grid",
							gridTemplateColumns: gridTemplate(displayColumns, showRowActions),
							gap: 1,
							px: 1.5,
							py: 0.75,
							minWidth: showRowActions ? 720 : 640,
						}}
					>
						{displayColumns.map((column) => (
							<Typography
								key={column.key}
								variant="caption"
								color="text.secondary"
								sx={{ fontWeight: 500 }}
							>
								{column.header}
							</Typography>
						))}
						{showRowActions ? <Box /> : null}
					</Box>

					<Stack
						spacing={1}
						data-test-id={`${tableTestId}--body`}
						sx={{ minWidth: showRowActions ? 720 : 640 }}
					>
						{visibleItems.map((item, index) => (
							<Box
								key={`${pathKey}-${index}`}
								data-test-id={`${tableTestId}--row--${index}`}
								sx={{
									display: "grid",
									gridTemplateColumns: gridTemplate(
										displayColumns,
										showRowActions,
									),
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
								{displayColumns.map((column) => (
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
								{showRowActions ? (
									<Stack
										direction="row"
										spacing={0.25}
										justifyContent="flex-end"
									>
										<IconButton
											size="small"
											disabled={readOnly}
											title="Редактировать"
											data-test-id={`${tableTestId}--edit--${index}`}
											onClick={() =>
												ctx.openAnketaModal?.(pathKey, index)
											}
										>
											<EditOutlinedIcon fontSize="small" />
										</IconButton>
										<IconButton
											size="small"
											disabled={readOnly}
											title="Удалить"
											data-test-id={`${tableTestId}--delete--${index}`}
											onClick={() =>
												ctx.deleteAnketaArrayItem?.(pathKey, index)
											}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Stack>
								) : null}
							</Box>
						))}
					</Stack>
				</Box>
			) : (
				<ListEmptyPlaceholder
					data-test-id={`${tableTestId}--empty`}
				>
					{readOnly && isTypicalWorks
						? "Типовые работы появятся после расчёта анкеты"
						: "Нет записей"}
				</ListEmptyPlaceholder>
			)}

			{typicalTotal != null ? (
				<Box
					sx={{
						mt: 1.5,
						display: "flex",
						justifyContent: "flex-end",
						alignItems: "center",
						gap: 1,
					}}
					data-test-id={`${tableTestId}--total`}
				>
					<Typography variant="body2" color="text.secondary">
						Итого по типовым работам:
					</Typography>
					<Typography
						variant="subtitle1"
						fontWeight={800}
						sx={{ fontFamily: "monospace" }}
					>
						{typicalTotal} ч/д
					</Typography>
				</Box>
			) : null}
		</Box>
	);
}
