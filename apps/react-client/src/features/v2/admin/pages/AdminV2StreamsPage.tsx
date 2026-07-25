import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useCreateV2StreamItem,
	useDeleteV2StreamItem,
	useUpdateV2StreamItem,
	useV2StreamsRegistryItems,
	type StreamRegistryItemInput,
} from "@react-client/common/api/queries/v2-streams";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { toast } from "@react-client/common/toasts";
import {
	isFactoryProtectedStreamCode,
	parseImplementationStreamPayload,
	type V2DictionaryItemDto,
} from "@smart-anketa/api-contract";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { type ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useState } from "react";

registerAgGridTableModules();

const GridWrapper = styled(Box)`
	width: 100%;
	flex: 1;
	min-height: 0;
	& .ag-root-wrapper {
		min-height: 360px;
		height: 100%;
	}
`;

type StreamRow = V2DictionaryItemDto & {
	isModelStream: boolean;
	isUmbrellaStream: boolean;
	isFactory: boolean;
	originLabel: string;
	activeLabel: string;
	kindLabel: string;
	dbNamesDisplay: string;
};

const emptyForm = (): StreamRegistryItemInput => ({
	code: "",
	label: "",
	order: 0,
	isActive: true,
	dbNames: "",
	legacyLabels: "",
	keycloakAliases: "",
	v1Labels: "",
	isModelStream: false,
	isUmbrellaStream: false,
});

function streamKindLabel(payload: {
	isUmbrellaStream: boolean;
	isModelStream: boolean;
}): string {
	if (payload.isUmbrellaStream) return "Зонтичный";
	if (payload.isModelStream) return "Дочерний модельный";
	return "Обычный";
}

function itemToForm(item: V2DictionaryItemDto): StreamRegistryItemInput {
	const payload = parseImplementationStreamPayload(item.payload, {
		label: item.label,
		code: item.code,
	});
	return {
		code: item.code,
		label: item.label,
		order: item.order,
		isActive: item.isActive,
		dbNames: payload.dbNames.join(", "),
		legacyLabels: payload.legacyLabels.join(", "),
		keycloakAliases: payload.keycloakAliases.join(", "),
		v1Labels: payload.v1Labels.join(", "),
		isModelStream: payload.isModelStream,
		isUmbrellaStream: payload.isUmbrellaStream,
	};
}

export function AdminV2StreamsPage() {
	const { mode } = useColorScheme();
	const gridPersistence = useAgGridColumnPersistence("v2.streams.registry");
	const { dictionary, dictionaryId, items, isLoading, isError } =
		useV2StreamsRegistryItems();

	const createStream = useCreateV2StreamItem();
	const updateStream = useUpdateV2StreamItem();
	const deleteStream = useDeleteV2StreamItem();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<V2DictionaryItemDto | null>(null);
	const [form, setForm] = useState<StreamRegistryItemInput>(emptyForm);

	const rows: StreamRow[] = useMemo(
		() =>
			items.map((item) => {
				const payload = parseImplementationStreamPayload(item.payload, {
					label: item.label,
					code: item.code,
				});
				const isFactory = isFactoryProtectedStreamCode(item.code);
				return {
					...item,
					isModelStream: payload.isModelStream,
					isUmbrellaStream: payload.isUmbrellaStream,
					isFactory,
					originLabel: isFactory ? "Из поставки" : "Добавлен вручную",
					activeLabel: item.isActive ? "Да" : "Нет",
					kindLabel: streamKindLabel(payload),
					dbNamesDisplay: payload.dbNames.join(", "),
				};
			}),
		[items],
	);

	const columnDefs = useMemo<ColDef<StreamRow>[]>(
		() => [
			{ field: "code", headerName: "Код", width: 110 },
			{ field: "label", headerName: "Подпись", flex: 1.4, minWidth: 180 },
			{
				field: "kindLabel",
				headerName: "Тип",
				width: 160,
				headerTooltip:
					"Зонтичный — общий каталог типовых работ для группы дочерних. Дочерний модельный — входит в зонтик «Модельный стрим». Обычный — самостоятельный стрим-исполнитель.",
			},
			{
				field: "originLabel",
				headerName: "Источник",
				width: 160,
				tooltipField: "originLabel",
				headerTooltip:
					"Из поставки — заводской стрим (удалить нельзя). Добавлен вручную — ваш стрим, можно удалить.",
			},
			{ field: "order", headerName: "Порядок", width: 100 },
			{
				field: "activeLabel",
				headerName: "В списках",
				width: 110,
				headerTooltip:
					"Да — стрим показывается в конструкторе, логике и форме анкеты. Нет — скрыт из новых выборов. Зонтичные не попадают в выбор implementationStream анкеты.",
			},
			{
				field: "dbNamesDisplay",
				headerName: "Имя в типовых работах",
				flex: 1.2,
				minWidth: 180,
				headerTooltip:
					"Как стрим записан в назначениях/нормах типовых работ. Первое имя — основное.",
			},
		],
		[],
	);

	const openCreate = useCallback(() => {
		setEditing(null);
		setForm({
			...emptyForm(),
			order: items.length,
		});
		setDialogOpen(true);
	}, [items.length]);

	const openEdit = useCallback((item: V2DictionaryItemDto) => {
		setEditing(item);
		setForm(itemToForm(item));
		setDialogOpen(true);
	}, []);

	const pending =
		createStream.isPending || updateStream.isPending || deleteStream.isPending;

	const editingIsFactory =
		Boolean(editing) && isFactoryProtectedStreamCode(editing!.code);

	const save = useCallback(() => {
		if (!dictionaryId) return;
		if (editing) {
			updateStream.mutate(
				{ itemId: editing.id, input: form },
				{
					onSuccess: () => {
						toast.success("Стрим обновлён");
						setDialogOpen(false);
					},
					onError: (err) =>
						toast.error("Не удалось сохранить", {
							description: apiErrorMessage(err),
						}),
				},
			);
			return;
		}
		createStream.mutate(
			{ dictionaryId, input: form },
			{
				onSuccess: () => {
					toast.success(
						form.isUmbrellaStream
							? "Зонтичный стрим создан"
							: "Стрим создан",
					);
					setDialogOpen(false);
				},
				onError: (err) =>
					toast.error("Не удалось создать", {
						description: apiErrorMessage(err),
					}),
			},
		);
	}, [createStream, dictionaryId, editing, form, updateStream]);

	const remove = useCallback(() => {
		if (!editing) return;
		if (isFactoryProtectedStreamCode(editing.code)) {
			toast.error("Заводской стрим нельзя удалить");
			return;
		}
		deleteStream.mutate(editing.id, {
			onSuccess: () => {
				toast.success("Стрим удалён");
				setDialogOpen(false);
			},
			onError: (err) =>
				toast.error("Не удалось удалить", {
					description: apiErrorMessage(err),
				}),
		});
	}, [deleteStream, editing]);

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			<Header>
				<Flex alignItems="center" gap={12} flexGrow={1}>
					<Typography variant="h6">Реестр стримов</Typography>
					<Typography variant="body2" color="text.secondary">
						{dictionary?.code ?? "v2.generalInfo.implementationStream"}
					</Typography>
					<Flex flexGrow={1} />
					<V2AdminButton onClick={openCreate} disabled={!dictionaryId || pending}>
						Добавить стрим
					</V2AdminButton>
				</Flex>
			</Header>
			<Spacer space={8} />
			<Card padding="12px" height="100%" overflow="hidden">
				<Flex flexDirection="column" gap={8} height="100%" minHeight="0">
					<Typography variant="body2" color="text.secondary">
						Стримы для анкеты, конструктора и типовых работ.{" "}
						<strong>Зонтичный</strong> — общий каталог типовых работ на группу
						дочерних (заводской пример: «Модельный стрим» / код{" "}
						<code>mdls</code>). <strong>Дочерний модельный</strong> — входит в
						этот зонтик. <strong>Из поставки</strong> — системные (удалить
						нельзя). <strong>Добавлен вручную</strong> — ваши, можно удалять.
					</Typography>
					{isError ? (
						<Alert severity="error">Не удалось загрузить справочник стримов</Alert>
					) : null}
					{!isLoading && !dictionaryId ? (
						<Alert severity="warning">
							Справочник implementationStream ещё не создан. Перезапустите
							сервер (factory seed) или создайте его в «Справочниках».
						</Alert>
					) : null}
					<GridWrapper>
						<AgGridReact<StreamRow>
							theme={
								mode === "dark" ? agGridCustomMUIThemeDark : agGridCustomMUITheme
							}
							icons={agGridIconSet}
							localeText={AG_GRID_LOCALE_RU}
							rowData={rows}
							columnDefs={columnDefs}
							getRowId={(p) => p.data.id}
							onRowDoubleClicked={(e) => {
								if (e.data) openEdit(e.data);
							}}
							onGridReady={gridPersistence.onGridReady}
							onColumnMoved={(event) =>
								gridPersistence.onColumnMoved(event.api)
							}
							onColumnResized={(event) => {
								if (event.finished) {
									gridPersistence.onColumnResized(event.api);
								}
							}}
							onColumnVisible={(event) =>
								gridPersistence.onColumnVisible(event.api)
							}
							onColumnPinned={(event) =>
								gridPersistence.onColumnPinned(event.api)
							}
							getMainMenuItems={getAgGridMainMenuItems}
							defaultColDef={{
								sortable: true,
								filter: true,
								resizable: true,
							}}
							loading={isLoading}
							suppressCellFocus
						/>
					</GridWrapper>
				</Flex>
			</Card>

			<Dialog
				open={dialogOpen}
				onClose={() => !pending && setDialogOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>
					{editing ? `Стрим «${editing.code}»` : "Новый стрим"}
					{editingIsFactory ? " · заводской" : ""}
				</DialogTitle>
				<DialogContent>
					<Flex flexDirection="column" gap={12} sx={{ pt: 1 }}>
						{editingIsFactory ? (
							<Typography variant="body2" color="text.secondary">
								Заводской стрим нельзя удалить. Можно изменить подпись,
								метаданные или отключить (Активен = нет).
							</Typography>
						) : null}
						<TextField
							label="Код"
							size="small"
							value={form.code}
							disabled={Boolean(editing) || pending}
							helperText="1–6 символов [a-z0-9]"
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									code: e.target.value.toLowerCase(),
								}))
							}
						/>
						<TextField
							label="Подпись"
							size="small"
							value={form.label}
							disabled={pending}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, label: e.target.value }))
							}
						/>
						<TextField
							label="Порядок"
							size="small"
							type="number"
							value={form.order}
							disabled={pending}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									order: Number(e.target.value) || 0,
								}))
							}
						/>
						<TextField
							label="DB-имена (через запятую)"
							size="small"
							value={form.dbNames}
							disabled={pending}
							helperText={
								form.isUmbrellaStream
									? "Для зонтика: подпись каталога типовых работ (напр. «Модельный стрим»)"
									: "Первое имя — канон для назначений типовых работ"
							}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, dbNames: e.target.value }))
							}
						/>
						<TextField
							label="Legacy-подписи"
							size="small"
							value={form.legacyLabels}
							disabled={pending}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									legacyLabels: e.target.value,
								}))
							}
						/>
						<TextField
							label="Keycloak / dept aliases"
							size="small"
							value={form.keycloakAliases}
							disabled={pending}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									keycloakAliases: e.target.value,
								}))
							}
						/>
						<TextField
							label="v1 labels"
							size="small"
							value={form.v1Labels}
							disabled={pending}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, v1Labels: e.target.value }))
							}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={form.isActive}
									disabled={pending}
									onChange={(_, checked) =>
										setForm((prev) => ({ ...prev, isActive: checked }))
									}
								/>
							}
							label="Активен"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={form.isUmbrellaStream}
									disabled={pending}
									onChange={(_, checked) =>
										setForm((prev) => ({
											...prev,
											isUmbrellaStream: checked,
											isModelStream: checked ? false : prev.isModelStream,
										}))
									}
								/>
							}
							label="Зонтичный / общий стрим"
						/>
						<Typography variant="caption" color="text.secondary">
							Зонтик — общий каталог типовых работ для нескольких дочерних
							стримов. Не выбирается в поле implementationStream анкеты.
						</Typography>
						<FormControlLabel
							control={
								<Switch
									checked={form.isModelStream}
									disabled={pending || form.isUmbrellaStream}
									onChange={(_, checked) =>
										setForm((prev) => ({
											...prev,
											isModelStream: checked,
											isUmbrellaStream: checked
												? false
												: prev.isUmbrellaStream,
										}))
									}
								/>
							}
							label="Дочерний модельный стрим"
						/>
						<Typography variant="caption" color="text.secondary">
							Дочерний — входит в зонтик «Модельный стрим» (общий каталог 10
							типовых работ). Нельзя совмещать с флагом зонтика.
						</Typography>
					</Flex>
				</DialogContent>
				<DialogActions>
					{editing && !editingIsFactory ? (
						<Button color="error" disabled={pending} onClick={remove}>
							Удалить
						</Button>
					) : null}
					<Button disabled={pending} onClick={() => setDialogOpen(false)}>
						Отмена
					</Button>
					<Button
						variant="contained"
						disabled={
							pending ||
							!form.code.trim() ||
							!form.label.trim() ||
							(!editing && !dictionaryId)
						}
						onClick={save}
					>
						Сохранить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
