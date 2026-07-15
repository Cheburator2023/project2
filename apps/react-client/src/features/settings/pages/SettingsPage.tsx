import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useAppVersionQuery } from "@react-client/common/api/queries/app-info";
import {
	FRONTEND_APP_NAME,
	FRONTEND_APP_VERSION,
	FRONTEND_GIT_REVISION,
} from "@react-client/common/app/buildInfo";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";

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
	const backendVersionQuery = useAppVersionQuery();

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
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
				</Flex>
			</Card>
		</Flex>
	);
}
