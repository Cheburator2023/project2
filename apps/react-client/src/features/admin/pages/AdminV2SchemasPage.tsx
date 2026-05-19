import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
	useResetV2TemplateToDefault,
	useV2Templates,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2AdminButton } from "@react-client/features/admin/V2Admin/atoms/V2AdminButton";
import { V2SchemaCreateDialog } from "@react-client/features/admin/V2Admin/organisms/V2SchemaCreateDialog";
import { V2TemplateList } from "@react-client/features/admin/V2Admin/organisms/V2TemplateList";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";

export function AdminV2SchemasPage() {
	const resetMutation = useResetV2TemplateToDefault();
	const { data: templates } = useV2Templates();

	const [selectedTemplateId, setSelectedTemplateId] = useState("");
	const [confirmResetOpen, setConfirmResetOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	useEffect(() => {
		if (!selectedTemplateId && templates?.length) {
			setSelectedTemplateId(templates[0].id);
		}
	}, [templates, selectedTemplateId]);

	const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Button
						component={RouterLink}
						to={routes.adminV2Guide.rootPath}
						variant="text"
					>
						Справка
					</Button>
					<Button
						variant="outlined"
						disabled={
							!selectedTemplateId || resetMutation.isPending || !templates?.length
						}
						onClick={() => setConfirmResetOpen(true)}
					>
						Сбросить к заводской схеме
					</Button>
					<V2AdminButton onClick={() => setCreateDialogOpen(true)}>
						Добавить схему
					</V2AdminButton>
				</Stack>
			</Header>

			{resetMutation.isError ? (
				<Typography color="error" variant="body2" sx={{ py: 0.5 }}>
					{resetMutation.error?.message ?? "Не удалось выполнить сброс"}
				</Typography>
			) : null}

			<V2TemplateList />

			<V2SchemaCreateDialog
				open={createDialogOpen}
				onClose={() => setCreateDialogOpen(false)}
			/>

			<Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)}>
				<DialogTitle>Сброс к заводской схеме</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет создана и опубликована новая версия шаблона «
						{selectedTemplate?.name ?? "…"}» с встроенным эталоном (базовая анкета, по
						мотивам v1). Текущая опубликованная версия будет заменена.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmResetOpen(false)}>Отмена</Button>
					<Button
						onClick={() => {
							if (!selectedTemplateId) return;
							resetMutation.mutate(selectedTemplateId, {
								onSuccess: () => setConfirmResetOpen(false),
							});
						}}
						color="warning"
						variant="contained"
						disabled={resetMutation.isPending}
					>
						Сбросить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
