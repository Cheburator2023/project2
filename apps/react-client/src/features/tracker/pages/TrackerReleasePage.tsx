import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useKanbanBoardRelease,
	useUpdateKanbanBoardRelease,
} from "@react-client/common/api/queries/kanban-board";
import { toast } from "@react-client/common/toasts";
import { TrackerReleaseStatusSelect } from "@react-client/features/tracker/components/TrackerReleaseStatusSelect";
import { isKanbanBoardReleaseStatusId } from "@smart-anketa/api-contract";
import { trackerPlanningPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { ReleaseDockLayout } from "@react-client/features/tracker/releases/ReleaseDockLayout";
import { ReleaseWorkspaceProvider } from "@react-client/features/tracker/releases/ReleaseWorkspaceContext";
import { commonRoutes } from "@react-client/routing/common/routes";
import { useNavigate, useParams } from "react-router";

export function TrackerReleasePage() {
	const navigate = useNavigate();
	const { releaseId = "" } = useParams();
	const { data, isLoading, error } = useKanbanBoardRelease(releaseId);
	const updateRelease = useUpdateKanbanBoardRelease();

	if (isLoading) {
		return (
			<Flex
				flexDirection="column"
				height="100%"
				alignItems="center"
				justifyContent="center"
			>
				<CircularProgress />
			</Flex>
		);
	}

	if (error || !data) {
		return (
			<Flex flexDirection="column" height="100%" padding="16px">
				<Alert severity="error">
					{error ? apiErrorMessage(error) : "Релиз не найден"}
				</Alert>
			</Flex>
		);
	}

	return (
		<ReleaseWorkspaceProvider value={data}>
			<Flex flexDirection="column" height="100%" minHeight="0">
				<Header
					title={`${data.code} · ${data.name}`}
					backTo={commonRoutes.trackerReleases.rootPath}
				>
					<Flex sx={{ width: 220 }} flexShrink={0}>
						<TrackerReleaseStatusSelect
							label="Статус"
							value={data.status}
							disabled={updateRelease.isPending}
							onChange={(status) => {
								if (status === data.status) return;
								if (!isKanbanBoardReleaseStatusId(status)) return;
								void updateRelease
									.mutateAsync({ id: data.id, data: { status } })
									.catch((err) => toast.error(apiErrorMessage(err)));
							}}
						/>
					</Flex>
					{data.planningId ? (
						<Button
							size="small"
							onClick={() => {
								if (!data.planningId) return;
								navigate(trackerPlanningPath(data.planningId));
							}}
							title="Открыть связанное планирование"
						>
							Планирование
						</Button>
					) : null}
				</Header>
				<Flex flexGrow={1} minHeight="0">
					<ReleaseDockLayout releaseId={data.id} />
				</Flex>
			</Flex>
		</ReleaseWorkspaceProvider>
	);
}
