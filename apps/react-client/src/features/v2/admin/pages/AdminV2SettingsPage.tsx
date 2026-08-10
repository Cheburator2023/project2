import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	useUpdateV2FactorySnapshotSetting,
	useV2FactorySnapshotSetting,
} from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { useV2DataTransferActions } from "@react-client/common/navigation/organisms/V2DataTransferMenu";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useSchemaConstructorSettings } from "@react-client/common/settings/schemaConstructorSettings";
import { toast } from "@react-client/common/toasts";
import { KeycloakRoleSyncPanel } from "@react-client/features/v2/admin/organisms/KeycloakRoleSyncPanel";
import { RoleCompatSettingsPanel } from "@react-client/features/v2/admin/organisms/RoleCompatSettingsPanel";
import { StreamFilterSettingsPanel } from "@react-client/features/v2/admin/organisms/StreamFilterSettingsPanel";
import { commonRoutes } from "@react-client/routing/common/routes";

export function AdminV2SettingsPage() {
	const { hideSystemFields, setHideSystemFields } = useSchemaConstructorSettings();
	const { data: factorySetting } = useV2FactorySnapshotSetting();
	const resetFactorySnapshot = useUpdateV2FactorySnapshotSetting();
	const v2Transfer = useV2DataTransferActions();

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			{v2Transfer.importDialog}
			<Header fixed title={commonRoutes.adminV2Settings.name} />
			<Spacer space={8} />
			<Card padding="24px" height="100%" overflow="auto">
				<Flex flexDirection="column" gap={24} maxWidth="720px">
					<Flex flexDirection="column" gap={8}>
						<Typography variant="h6">Конструктор схемы</Typography>
						<Typography variant="body2" color="text.secondary">
							Настройки редактора шаблона v2 (холст DnD и дерево полей).
						</Typography>
					</Flex>
					<FormControlLabel
						control={
							<Switch
								checked={hideSystemFields}
								onChange={(_, checked) => setHideSystemFields(checked)}
								inputProps={{
									"aria-label": "Скрывать системные поля в конструкторе схемы",
								}}
							/>
						}
						label="Скрывать системные поля"
					/>
					<Typography variant="body2" color="text.secondary">
						Workflow, summary и другие секции с пометкой «системное» не
						отображаются на холсте и в дереве полей. Порядок и данные в схеме
						сохраняются.
					</Typography>

					<Divider />

					<StreamFilterSettingsPanel />

					<Divider />

					<RoleCompatSettingsPanel />

					<Divider />

					<KeycloakRoleSyncPanel />

					<Divider />

					<Flex flexDirection="column" gap={8}>
						<Typography variant="h6">Заводской эталон v2</Typography>
						<Typography variant="body2" color="text.secondary">
							Источник снимка для «Создать схему → Заводская» и «Сбросить к
							заводской». Встроенный JSON в репозитории не удаляется.
						</Typography>
					</Flex>
					<Typography variant="body2">
						{factorySetting?.source === "template" && factorySetting.templateName
							? `Сейчас: схема «${factorySetting.templateName}»${
									factorySetting.versionNumber != null
										? `, версия ${factorySetting.versionNumber}`
										: ""
								}`
							: "Сейчас: встроенный JSON-снимок из репозитория"}
					</Typography>
					<Button
						variant="outlined"
						disabled={
							factorySetting?.source === "builtin" ||
							resetFactorySnapshot.isPending
						}
						onClick={() =>
							resetFactorySnapshot.mutate(
								{ source: "builtin" },
								{
									onSuccess: () =>
										toast.success("Восстановлен встроенный заводской эталон"),
									onError: (err) =>
										toast.error("Не удалось сбросить эталон", {
											description: apiErrorMessage(err),
										}),
								},
							)
						}
					>
						Вернуть встроенный эталон
					</Button>

					<Divider />

					<Flex flexDirection="column" gap={8}>
						<Typography variant="h6">Данные v2</Typography>
						<Typography variant="body2" color="text.secondary">
							Выгрузка и загрузка JSON-снапшота шаблонов, справочников, типовых
							работ и анкет.
						</Typography>
					</Flex>
					<Alert severity="info">
						Аудит v2 при импорте не переносится. Режим замены удаляет только
						выбранные разделы на стенде. При загрузке проверяется sha256
						содержимого файла (поле meta.sha256). Формулы типовых работ хранятся
						в конфигах версий шаблонов — для полного переноса выгружайте «Шаблоны»
						и «Типовые работы» вместе.
					</Alert>
					<Flex flexDirection="column" gap={8}>
						<Typography variant="subtitle2">
							Разделы для выгрузки и загрузки
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Отметьте разделы для пакетной выгрузки или импорта. У каждого
							раздела — кнопки «Скачать» и «Загрузить»; имя файла содержит
							список разделов, например{" "}
							<code>
								smart-anketa-v2-templates-dictionaries-2026-07-15-12-43-30.json
							</code>
							.
						</Typography>
						{v2Transfer.sectionCheckboxes}
					</Flex>
					<Flex gap={12} wrap="wrap">
						<Button
							variant="contained"
							startIcon={<DownloadRoundedIcon />}
							onClick={v2Transfer.onExport}
							disabled={
								v2Transfer.exportMutation.isPending ||
								!v2Transfer.sectionsSelected
							}
						>
							{v2Transfer.isBulkExportPending
								? "Выгрузка…"
								: "Выгрузить выбранные разделы"}
						</Button>
						<Button
							variant="outlined"
							startIcon={<UploadRoundedIcon />}
							onClick={v2Transfer.onImport}
							disabled={!v2Transfer.sectionsSelected}
						>
							Загрузить данные v2
						</Button>
					</Flex>
				</Flex>
			</Card>
		</Flex>
	);
}
