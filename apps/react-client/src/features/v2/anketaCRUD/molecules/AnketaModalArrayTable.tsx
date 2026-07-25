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
import { isAnketaArchPathReadOnly } from "../utils/anketaPathLock.util";
import {
	arrayTableShowsRowActions,
	collectTypicalWorkSourceNames,
	filterTypicalWorkItems,
	getArrayAtPath,
	getTypicalWorkFactoryTableColumns,
	isTypicalWorkArrayPath,
	resolveArrayTableColumns,
	schemaItemsLookLikeTypicalWork,
	sumTypicalWorkTotals,
	type AnketaArrayTableColumn,
} from "../utils/anketaModalArrayTableConfig";
import {
	dedupeTypicalWorkRowsByWorkId,
	resolveTypicalWorkCatalogStreamLabel,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { TypicalWorkSummaryTotal } from "./TypicalWorkSummaryTotal";
import { shouldMaskWorkEstimatesForViewerAtPath } from "@smart-anketa/api-contract";

const ESTIMATE_TABLE_COLUMN_KEYS = new Set([
	"estimate",
	"coefficient",
	"total",
]);

const SOURCE_STREAM_EXECUTOR = "Источники данных";

type Props = {
	pathKey: string;
	sectionTitle: string;
	/** Подсказка под заголовком (ui:description массива). */
	sectionHint?: string;
	/** Явно: блок archComponent=typicalWork (надёжнее path-детекции). */
	forceTypicalWorkLayout?: boolean;
};

function gridTemplate(
	columns: AnketaArrayTableColumn[],
	showRowActions: boolean,
	showRowIndex = false,
): string {
	const indexCol = showRowIndex ? "28px " : "";
	const cols = columns.map((col) => col.width ?? "1fr").join(" ");
	return showRowActions
		? `${indexCol}${cols} 72px`
		: `${indexCol}${cols}`;
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
				overflow: column.multiline ? "visible" : "hidden",
				textOverflow: column.multiline ? "clip" : "ellipsis",
				whiteSpace: column.multiline ? "pre-wrap" : "nowrap",
				fontFamily: column.key === "coefficient" ? "monospace" : undefined,
				fontSize: column.key === "coefficient" ? 12 : undefined,
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
	forceTypicalWorkLayout = false,
	formContext,
}: Props & { formContext: unknown }) {
	const ctx = readAnketaFormContext(formContext);
	const previewUiSchema = ctx.previewUiSchema as
		| Record<string, unknown>
		| undefined;
	const isTypicalWorks =
		forceTypicalWorkLayout ||
		isTypicalWorkArrayPath(pathKey, previewUiSchema) ||
		schemaItemsLookLikeTypicalWork(
			ctx.previewSchema,
			ctx.previewUiSchema,
			pathKey,
		);
	const columns = isTypicalWorks
		? getTypicalWorkFactoryTableColumns()
		: resolveArrayTableColumns(
				pathKey,
				ctx.previewSchema,
				ctx.previewUiSchema,
			);
	const readOnly = isAnketaArchPathReadOnly(formContext, pathKey);
	const showRowActions = arrayTableShowsRowActions(pathKey, formContext);
	const items = useMemo(() => {
		const rawItems = getArrayAtPath(ctx.formData ?? {}, pathKey);
		if (!isTypicalWorks) return rawItems;
		const streamExecutor = resolveTypicalWorkCatalogStreamLabel(
			previewUiSchema,
			pathKey,
		);
		return dedupeTypicalWorkRowsByWorkId(rawItems, {
			groupBySourceName: streamExecutor === SOURCE_STREAM_EXECUTOR,
		});
	}, [ctx.formData, isTypicalWorks, pathKey, previewUiSchema]);
	const sourceNames = useMemo(
		() => (isTypicalWorks ? collectTypicalWorkSourceNames(items) : []),
		[isTypicalWorks, items],
	);
	const [sourceNameFilter, setSourceNameFilter] = useState<string | null>(null);
	const visibleItems = useMemo(() => {
		if (!isTypicalWorks || sourceNames.length <= 1) return items;
		return filterTypicalWorkItems(items, sourceNameFilter);
	}, [isTypicalWorks, items, sourceNameFilter, sourceNames.length]);
	const maskEstimates = useMemo(() => {
		if (!ctx.viewerAccess?.applyAccessRules || !ctx.previewUiSchema) {
			return false;
		}
		return shouldMaskWorkEstimatesForViewerAtPath(
			ctx.viewerAccess,
			ctx.previewUiSchema,
			pathKey,
			{ applyAccessRules: true },
		);
	}, [ctx.previewUiSchema, ctx.viewerAccess, pathKey]);
	const typicalTotal = isTypicalWorks
		? maskEstimates
			? null
			: sumTypicalWorkTotals(visibleItems)
		: null;
	const calculationLoading = Boolean(
		ctx.calculationLoading ?? ctx.devCalculationLoading,
	);
	const highlightUncertaintySync = Boolean(
		ctx.atypicalUncertaintySyncHighlightPaths?.has(pathKey),
	);
	const uncertaintyHighlightSx = highlightUncertaintySync
		? {
				borderRadius: 2,
				p: 1.5,
				border: "2px solid",
				borderColor: "warning.main",
				bgcolor: "rgba(255, 193, 7, 0.08)",
			}
		: undefined;
	const displayColumns = columns;

	const tableTestId = anketaMoleculeTestIdForPath(
		ANKETA_MOLECULE_TEST_IDS.arrayTable,
		pathKey,
	);

	// Fallback for paths without a column config (e.g., custom constructor schemas)
	if (!displayColumns) {
		return (
			<Box
				data-test-id={tableTestId}
				sx={{ minWidth: 0, ...uncertaintyHighlightSx }}
			>
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
				{isTypicalWorks && visibleItems.length > 1 ? (
					<TypicalWorkSummaryTotal
						total={typicalTotal}
						loading={calculationLoading}
						data-test-id={`${tableTestId}--total`}
						sx={{ mt: 1.5 }}
					/>
				) : null}
			</Box>
		);
	}

	return (
		<Box
			data-test-id={tableTestId}
			sx={{ minWidth: 0, ...uncertaintyHighlightSx }}
		>
			{highlightUncertaintySync ? (
				<Typography
					variant="caption"
					color="warning.main"
					sx={{ mb: 1, display: "block" }}
				>
					Коэффициенты обновлены по результатам расчёта общей неопределённости
				</Typography>
			) : null}
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
							gridTemplateColumns: gridTemplate(
								displayColumns,
								showRowActions,
								isTypicalWorks,
							),
							gap: 1,
							px: 1.5,
							py: 0.75,
							minWidth: showRowActions ? 720 : 640,
						}}
					>
						{isTypicalWorks ? <Box /> : null}
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
									display: "flex",
									flexDirection: "column",
									gap: 0.75,
									px: 1.5,
									py: 1.25,
									bgcolor: "grey.50",
									borderRadius: 1.5,
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: gridTemplate(
											displayColumns,
											showRowActions,
											isTypicalWorks,
										),
										gap: 1,
										alignItems: "center",
										minWidth: showRowActions ? 720 : 640,
									}}
								>
									{isTypicalWorks ? (
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{ lineHeight: 1.4 }}
										>
											{index + 1}
										</Typography>
									) : null}
									{displayColumns.map((column) => {
										const rawValue = column.render
											? column.render(item)
											: String(item[column.field ?? column.key] ?? "—");
										const value =
											maskEstimates &&
											ESTIMATE_TABLE_COLUMN_KEYS.has(column.key)
												? "—"
												: rawValue;
										return (
											<CellValue
												key={column.key}
												column={column}
												value={value}
											/>
										);
									})}
									{showRowActions && !readOnly ? (
										<Stack
											direction="row"
											spacing={0.25}
											justifyContent="flex-end"
										>
											<IconButton
												size="small"
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
							</Box>
						))}
					</Stack>
				</Box>
			) : (
				<ListEmptyPlaceholder
					data-test-id={`${tableTestId}--empty`}
				>
					{isTypicalWorks
						? "Типовые работы появятся при выполнении условий появления"
						: "Нет записей"}
				</ListEmptyPlaceholder>
			)}

			{isTypicalWorks && visibleItems.length > 1 ? (
				<TypicalWorkSummaryTotal
					total={typicalTotal}
					loading={calculationLoading}
					data-test-id={`${tableTestId}--total`}
					sx={{ mt: 1.5 }}
				/>
			) : null}
		</Box>
	);
}
