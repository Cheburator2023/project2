import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import type { ColDef } from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { useMemo, useState, type ReactNode } from "react";
import {
	TrackerRegistryGrid,
	type TrackerRegistryContextAction,
} from "./TrackerRegistryGrid";
import {
	TrackerFormDialog,
	type TrackerFormField,
} from "./TrackerFormDialog";
import { buildTrackerCreateFormValues } from "../trackerAutoCode";

type Props<TRow extends object> = {
	title: string;
	createLabel: string;
	searchPlaceholder: string;
	rowData: TRow[];
	columnDefs: ColDef<TRow>[];
	loading?: boolean;
	formFields?: TrackerFormField[];
	getInitialFormValues?: (row: TRow | null) => Record<string, string>;
	contextActions?: TrackerRegistryContextAction<TRow>[];
	onRowDoubleClick?: (row: TRow) => void;
	onCreateClick?: () => void;
	onEditClick?: (row: TRow) => void;
	onCreate?: (values: Record<string, string>) => Promise<void>;
	onUpdate?: (row: TRow, values: Record<string, string>) => Promise<void>;
	onDelete: (rows: TRow[]) => Promise<void>;
	canDelete?: (row: TRow) => boolean;
	deleteDialogTitle?: string;
	deleteDialogText?: (count: number) => ReactNode;
	extraActions?: ReactNode;
};

export function TrackerRegistryPage<TRow extends object>({
	title,
	createLabel,
	searchPlaceholder,
	rowData,
	columnDefs,
	loading,
	formFields = [],
	getInitialFormValues,
	contextActions = [],
	onRowDoubleClick,
	onCreateClick,
	onEditClick,
	onCreate,
	onUpdate,
	onDelete,
	canDelete = () => true,
	deleteDialogTitle = "Удаление",
	deleteDialogText = (count) => `Удалить выбранные записи (${count})?`,
	extraActions,
}: Props<TRow>) {
	const [quickFilter, setQuickFilter] = useState("");
	const [selected, setSelected] = useState<TRow[]>([]);
	const [formOpen, setFormOpen] = useState(false);
	const [editingRow, setEditingRow] = useState<TRow | null>(null);
	const [createFormValues, setCreateFormValues] = useState<Record<string, string>>(
		{},
	);
	const [pendingDelete, setPendingDelete] = useState<TRow[] | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const deletableSelected = useMemo(
		() => selected.filter(canDelete),
		[selected, canDelete],
	);

	const useFormDialog = !onCreateClick && !onEditClick;

	const openCreateForm = () => {
		setEditingRow(null);
		setCreateFormValues(
			buildTrackerCreateFormValues(formFields, getInitialFormValues?.(null) ?? {}),
		);
		setFormOpen(true);
	};

	const openEditForm = (row: TRow) => {
		setEditingRow(row);
		setFormOpen(true);
	};

	const allContextActions = useMemo<TrackerRegistryContextAction<TRow>[]>(
		() => [
			{
				label: "Редактировать",
				onClick: (row) => {
					if (onEditClick) {
						onEditClick(row);
						return;
					}
					openEditForm(row);
				},
			},
			...contextActions,
			{
				label: "Удалить",
				disabled: (row) => !canDelete(row),
				onClick: (row) => setPendingDelete([row]),
			},
		],
		[contextActions, canDelete, onEditClick],
	);

	const handleSubmit = async (values: Record<string, string>) => {
		setIsSaving(true);
		try {
			if (editingRow) {
				await onUpdate?.(editingRow, values);
			} else {
				await onCreate?.(values);
			}
			setFormOpen(false);
			setEditingRow(null);
			setSelected([]);
		} finally {
			setIsSaving(false);
		}
	};

	const confirmDelete = async () => {
		if (!pendingDelete?.length) return;
		setIsDeleting(true);
		try {
			await onDelete(pendingDelete.filter(canDelete));
			setPendingDelete(null);
			setSelected([]);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header>
				<Flex gap={1} wrap="wrap" alignItems="center">
					<TextField
						size="small"
						placeholder={searchPlaceholder}
						value={quickFilter}
						onChange={(event) => setQuickFilter(event.target.value)}
						sx={{
							width: { xs: "100%", sm: 320 },
							maxWidth: 420,
							flexShrink: 0,
						}}
					/>
					<Spacer />
					{extraActions}
					<V2AdminButton
						onClick={() => {
							if (onCreateClick) {
								onCreateClick();
								return;
							}
							openCreateForm();
						}}
					>
						{createLabel}
					</V2AdminButton>
					<V2AdminButton
						color="error"
						variant="outlined"
						disabled={!deletableSelected.length || isDeleting}
						onClick={() => setPendingDelete(selected)}
					>
						Удалить выбранные
						{deletableSelected.length ? ` (${deletableSelected.length})` : ""}
					</V2AdminButton>
				</Flex>
			</Header>

			<TrackerRegistryGrid
				rowData={rowData}
				columnDefs={columnDefs}
				loading={loading}
				quickFilter={quickFilter}
				onSelectionChange={setSelected}
				onRowDoubleClick={onRowDoubleClick}
				contextActions={allContextActions}
			/>

			{useFormDialog ? (
				<TrackerFormDialog
					open={formOpen}
					title={editingRow ? `Редактирование: ${title}` : `Новый: ${title}`}
					fields={formFields}
					initialValues={
						editingRow
							? getInitialFormValues?.(editingRow)
							: createFormValues
					}
					isSubmitting={isSaving}
					onClose={() => {
						setFormOpen(false);
						setEditingRow(null);
					}}
					onSubmit={handleSubmit}
				/>
			) : null}

			<Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
				<DialogTitle>{deleteDialogTitle}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{deleteDialogText(pendingDelete?.filter(canDelete).length ?? 0)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPendingDelete(null)}>Отмена</Button>
					<Button
						color="error"
						variant="contained"
						disabled={isDeleting || !pendingDelete?.some(canDelete)}
						onClick={() => void confirmDelete()}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
