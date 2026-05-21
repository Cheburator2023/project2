import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import {
	useCreateV2DictionaryItem,
	useDeleteV2DictionaryItem,
	useUpdateV2Dictionary,
	useUpdateV2DictionaryItem,
	useV2Dictionary,
	useV2DictionaryFieldUsages,
	useV2DictionaryItems,
} from "@react-client/common/api/queries/v2-templates";
import type {
	V2DictionaryFieldUsageDto,
	V2DictionaryItemDto,
} from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type ColDef,
	ModuleRegistry,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import Link from "@mui/material/Link";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { pathForAdminV2Template } from "@react-client/routing/common/pathHelpers";

export type V2DictionaryHeaderState = {
	title: string;
	code: string;
	isEditing: boolean;
	savePending: boolean;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSave: () => void;
};

ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

const GridWrapper = styled(Box)`
	width: 100%;
	min-height: 280px;
	& .ag-root-wrapper {
		min-height: 280px;
	}
`;

type ItemFormState = {
	code: string;
	label: string;
	order: number;
	isActive: boolean;
};

const emptyItemForm = (): ItemFormState => ({
	code: "",
	label: "",
	order: 0,
	isActive: true,
});

export function V2DictionaryDetail({
	dictionaryId,
	onHeaderChange,
}: {
	dictionaryId: string;
	onHeaderChange?: (state: V2DictionaryHeaderState | null) => void;
}) {
	const { mode } = useColorScheme();

	const { data: dictionary, isLoading: dictLoading } = useV2Dictionary(dictionaryId);
	const { data: items = [], isLoading: itemsLoading } =
		useV2DictionaryItems(dictionaryId);
	const { data: usages = [], isLoading: usagesLoading } =
		useV2DictionaryFieldUsages(dictionaryId);

	const updateDictionary = useUpdateV2Dictionary();
	const createItem = useCreateV2DictionaryItem();
	const updateItem = useUpdateV2DictionaryItem();
	const deleteItem = useDeleteV2DictionaryItem();

	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const [itemDialogOpen, setItemDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<V2DictionaryItemDto | null>(null);
	const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);

	useEffect(() => {
		if (!dictionary) return;
		setName(dictionary.name);
		setDescription(dictionary.description ?? "");
	}, [dictionary]);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const itemColumns = useMemo<ColDef<V2DictionaryItemDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "label", headerName: "Подпись", flex: 1.5, minWidth: 160 },
			{ field: "order", headerName: "Порядок", width: 100 },
			{
				field: "isActive",
				headerName: "Активен",
				width: 100,
				valueFormatter: (p) => (p.value ? "да" : "нет"),
			},
		],
		[],
	);

	const usageColumns = useMemo<ColDef<V2DictionaryFieldUsageDto>[]>(
		() => [
			{ field: "templateName", headerName: "Схема", flex: 1, minWidth: 140 },
			{
				field: "versionNumber",
				headerName: "Версия",
				width: 90,
				valueFormatter: (p) => `v${p.value}`,
			},
			{ field: "versionStatus", headerName: "Статус", width: 110 },
			{
				field: "fieldPointer",
				headerName: "Поле (JSON Pointer)",
				flex: 1.2,
				minWidth: 180,
			},
			{
				field: "fieldTitle",
				headerName: "Подпись поля",
				flex: 1,
				minWidth: 120,
				valueFormatter: (p) => (p.value == null ? "" : String(p.value)),
			},
		],
		[],
	);

	const { mutateAsync: saveDictionaryMeta, isPending: saveMetaPending } =
		updateDictionary;

	const handleSaveMeta = useCallback(async () => {
		if (!dictionary) return;
		await saveDictionaryMeta({
			id: dictionary.id,
			dto: {
				name: name.trim(),
				description: description.trim() || null,
			},
		});
		setIsEditing(false);
	}, [dictionary, description, name, saveDictionaryMeta]);

	const handleCancelEdit = useCallback(() => {
		if (!dictionary) return;
		setName(dictionary.name);
		setDescription(dictionary.description ?? "");
		setIsEditing(false);
	}, [dictionary]);

	const handleSaveMetaRef = useRef(handleSaveMeta);
	handleSaveMetaRef.current = handleSaveMeta;
	const handleCancelEditRef = useRef(handleCancelEdit);
	handleCancelEditRef.current = handleCancelEdit;

	useEffect(() => {
		if (!dictionary) {
			onHeaderChange?.(null);
			return;
		}

		onHeaderChange?.({
			title: dictionary.name,
			code: dictionary.code,
			isEditing,
			savePending: saveMetaPending,
			onStartEdit: () => setIsEditing(true),
			onCancelEdit: () => handleCancelEditRef.current(),
			onSave: () => void handleSaveMetaRef.current(),
		});
	}, [
		dictionary?.id,
		dictionary?.name,
		dictionary?.code,
		isEditing,
		saveMetaPending,
		onHeaderChange,
	]);

	const openAddItem = () => {
		setEditingItem(null);
		setItemForm({
			...emptyItemForm(),
			order: items.length,
		});
		setItemDialogOpen(true);
	};

	const openEditItem = (row: V2DictionaryItemDto) => {
		setEditingItem(row);
		setItemForm({
			code: row.code,
			label: row.label,
			order: row.order,
			isActive: row.isActive,
		});
		setItemDialogOpen(true);
	};

	const handleSaveItem = async () => {
		if (!dictionary) return;
		const code = itemForm.code.trim();
		const label = itemForm.label.trim();
		if (!code || !label) return;

		if (editingItem) {
			await updateItem.mutateAsync({
				itemId: editingItem.id,
				dto: {
					label,
					order: itemForm.order,
					isActive: itemForm.isActive,
				},
			});
		} else {
			await createItem.mutateAsync({
				dictionaryId: dictionary.id,
				dto: {
					code,
					label,
					order: itemForm.order,
					isActive: itemForm.isActive,
				},
			});
		}

		setItemDialogOpen(false);
	};

	if (dictLoading || !dictionary) {
		return (
			<Typography variant="body2" sx={{ p: 2 }}>
				{dictLoading ? "Загрузка справочника…" : "Справочник не найден"}
			</Typography>
		);
	}

	const defaultFieldPointer = (() => {
		for (const i of items) {
			const fp = i.payload?.fieldPointer;
			if (typeof fp === "string" && fp.trim()) return fp;
		}
		return null;
	})();

	return (
		<Flex flexDirection="column" gap={2} sx={{ p: 1, minHeight: 0, flexGrow: 1 }}>
			<Card>
				<TextField
					label="Код"
					size="small"
					fullWidth
					value={dictionary.code}
					disabled
					helperText="Код меняется только при создании; по нему поле привязывается в uiSchema"
					sx={{ mb: 2 }}
				/>
				<TextField
					label="Название"
					size="small"
					fullWidth
					value={name}
					disabled={!isEditing}
					onChange={(e) => setName(e.target.value)}
					sx={{ mb: 2 }}
				/>
				<TextField
					label="Описание"
					size="small"
					fullWidth
					multiline
					minRows={2}
					value={description}
					disabled={!isEditing}
					onChange={(e) => setDescription(e.target.value)}
				/>
				{defaultFieldPointer ? (
					<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
						Заводская привязка к полю схемы: <code>{String(defaultFieldPointer)}</code>
					</Typography>
				) : null}
			</Card>

			<Card>
				<Flex justifyContent="flex-end" alignItems="center" sx={{ mb: 1 }}>
					<Button size="small" variant="outlined" onClick={openAddItem}>
						Добавить элемент
					</Button>
				</Flex>
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
					В анкете и в JSON Logic сохраняется код элемента; подпись — для отображения.
				</Typography>
				<GridWrapper>
					<AgGridReact<V2DictionaryItemDto>
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={items}
						columnDefs={itemColumns}
						loading={itemsLoading}
						onRowDoubleClicked={(e) => {
							if (e.data) openEditItem(e.data);
						}}
						localeText={AG_GRID_LOCALE_RU}
						defaultColDef={{ sortable: true, resizable: true }}
					/>
				</GridWrapper>
			</Card>

			<Card>
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
					Поля с <code>ui:options.dictionaryCode = {dictionary.code}</code> во всех версиях
					шаблонов. Актуальная опубликованная версия отмечена чипом.
				</Typography>

				{usagesLoading ? (
					<Typography variant="body2" color="text.secondary">
						Поиск привязок…
					</Typography>
				) : usages.length === 0 ? (
					<Alert severity="info">
						Ни одна версия схемы не ссылается на этот справочник. Привяжите код в конструкторе
						схемы (блок «Справочник V2» у поля) или выполните сброс к заводской схеме.
					</Alert>
				) : (
					<>
						<Flex gap={0.5} wrap="wrap" sx={{ mb: 1 }}>
							{usages.map((u) => (
								<Chip
									key={`${u.versionId}-${u.fieldPointer}`}
									size="small"
									variant="outlined"
									color={u.isCurrentPublished ? "success" : "default"}
									label={`${u.templateCode} · ${u.fieldPointer}`}
								/>
							))}
						</Flex>
						<Box sx={{ minHeight: 220 }}>
							<GridWrapper>
							<AgGridReact<V2DictionaryFieldUsageDto>
								theme={gridTheme}
								icons={agGridIconSet}
								rowData={usages}
								columnDefs={usageColumns}
								localeText={AG_GRID_LOCALE_RU}
								defaultColDef={{ sortable: true, resizable: true }}
							/>
							</GridWrapper>
						</Box>
						<Divider sx={{ my: 1 }} />
						<Typography variant="caption" color="text.secondary">
							Переход к редактору схемы:
						</Typography>
						<Flex gap={1} wrap="wrap" sx={{ mt: 0.5 }}>
							{[
								...new Map(
									usages.map((u) => [
										u.templateId,
										{ id: u.templateId, name: u.templateName },
									]),
								).values(),
							].map((t) => (
								<Link
									key={t.id}
									component={RouterLink}
									to={pathForAdminV2Template(t.id)}
									underline="hover"
									variant="body2"
								>
									{t.name}
								</Link>
							))}
						</Flex>
					</>
				)}
			</Card>

			<Dialog
				open={itemDialogOpen}
				onClose={() => setItemDialogOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>
					{editingItem ? "Редактировать элемент" : "Новый элемент"}
				</DialogTitle>
				<DialogContent>
					<TextField
						margin="dense"
						label="Код"
						fullWidth
						disabled={Boolean(editingItem)}
						value={itemForm.code}
						onChange={(e) => setItemForm((f) => ({ ...f, code: e.target.value }))}
						helperText="Значение в данных анкеты и в условиях JSON Logic"
					/>
					<TextField
						margin="dense"
						label="Подпись"
						fullWidth
						value={itemForm.label}
						onChange={(e) => setItemForm((f) => ({ ...f, label: e.target.value }))}
					/>
					<TextField
						margin="dense"
						label="Порядок"
						type="number"
						fullWidth
						value={itemForm.order}
						onChange={(e) =>
							setItemForm((f) => ({
								...f,
								order: Number.parseInt(e.target.value, 10) || 0,
							}))
						}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={itemForm.isActive}
								onChange={(e) =>
									setItemForm((f) => ({ ...f, isActive: e.target.checked }))
								}
							/>
						}
						label="Активен"
					/>
				</DialogContent>
				<DialogActions>
					{editingItem ? (
						<Button
							color="error"
							onClick={() => {
								void deleteItem.mutateAsync(editingItem.id);
								setItemDialogOpen(false);
							}}
						>
							Удалить
						</Button>
					) : null}
					<Box sx={{ flex: 1 }} />
					<Button onClick={() => setItemDialogOpen(false)}>Отмена</Button>
					<Button variant="contained" onClick={() => void handleSaveItem()}>
						Сохранить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
