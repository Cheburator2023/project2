import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useAppVersionQuery } from "@react-client/common/api/queries/app-info";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { useV2DataTransferActions } from "@react-client/common/navigation/organisms/V2DataTransferMenu";
import {
	FRONTEND_APP_NAME,
	FRONTEND_APP_VERSION,
	FRONTEND_GIT_REVISION,
} from "@react-client/common/app/buildInfo";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useSchemaConstructorSettings } from "@react-client/common/settings/schemaConstructorSettings";
import { usePermissions } from "@react-client/hooks/usePermissions";

function VersionRow({
	label,
	name,
	version,
	gitRevision,
	loading,
	error,
}: {
	label: string;
	name: string;
	version: string;
	gitRevision: string | null;
	loading?: boolean;
	error?: boolean;
}) {
	return (
		<Flex flexDirection="column" gap={4}>
			<Typography variant="subtitle2" color="text.secondary">
				{label}
			</Typography>
			{loading ? (
				<CircularProgress size={20} />
			) : error ? (
				<Typography variant="body2" color="error">
					Не удалось получить версию
				</Typography>
			) : (
				<Flex flexDirection="column" gap={2}>
					<Typography variant="body1">{name}</Typography>
					<Typography variant="body2" color="text.secondary">
						Версия: {version}
					</Typography>
					{gitRevision ? (
						<Typography variant="body2" color="text.secondary">
							Сборка: {gitRevision}
						</Typography>
					) : null}
				</Flex>
			)}
		</Flex>
	);
}

export function SettingsPage() {
	const { canAccessAdminPanel } = usePermissions();
	const { hideSystemFields, setHideSystemFields } = useSchemaConstructorSettings();
	const backendVersionQuery = useAppVersionQuery();
	const v2Transfer = useV2DataTransferActions();

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			{v2Transfer.importDialog}
			<Header title="Настройки" />
			<Spacer space={8} />
			<Card padding="24px" height="100%" overflow="auto">
				<Flex flexDirection="column" gap={24} maxWidth="720px">
					<Flex flexDirection="column" gap={8}>
						<Typography variant="h6">Версии приложения</Typography>
						<Typography variant="body2" color="text.secondary">
							Последняя версия из CHANGELOG.md для фронтенда и бэкенда.
						</Typography>
					</Flex>

					<Flex flexDirection="column" gap={16}>
						<VersionRow
							label="Фронтенд"
							name={FRONTEND_APP_NAME}
							version={FRONTEND_APP_VERSION}
							gitRevision={FRONTEND_GIT_REVISION}
						/>
						<Divider />
						<VersionRow
							label="Бэкенд"
							name={backendVersionQuery.data?.name ?? "nestjs-server"}
							version={backendVersionQuery.data?.version ?? "—"}
							gitRevision={backendVersionQuery.data?.gitRevision ?? null}
							loading={backendVersionQuery.isPending}
							error={backendVersionQuery.isError}
						/>
					</Flex>

					<Divider />

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

					{canAccessAdminPanel ? (
						<>
							<Divider />
							<Flex flexDirection="column" gap={8}>
								<Typography variant="h6">Данные v2</Typography>
								<Typography variant="body2" color="text.secondary">
									Выгрузка и загрузка JSON-снапшота шаблонов, справочников,
									типовых работ и анкет.
								</Typography>
							</Flex>
							<Alert severity="info">
								Аудит v2 при импорте не переносится. Режим замены удаляет только
								выбранные разделы на стенде.
							</Alert>
							<Flex flexDirection="column" gap={8}>
								<Typography variant="subtitle2">Разделы для выгрузки и загрузки</Typography>
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
									{v2Transfer.exportMutation.isPending
										? "Выгрузка…"
										: "Выгрузить данные v2"}
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
						</>
					) : null}
				</Flex>
			</Card>
		</Flex>
	);
}
