import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useKanbanBoardPlanning,
	useUpdateKanbanBoardPlanningLayout,
} from "@react-client/common/api/queries/kanban-board";
import { PlanningDockLayout } from "@react-client/features/tracker/planning/PlanningDockLayout";
import type { PlanningDockLayoutHandle } from "@react-client/features/tracker/planning/PlanningDockLayout";
import { PlanningLayoutPresetDialog } from "@react-client/features/tracker/planning/PlanningLayoutPresetDialog";
import { PlanningWorkspaceProvider } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import {
	PLANNING_DOCK_PANEL_TITLES,
	isPlanningDockLayout,
	type PlanningDockPanelId,
} from "@react-client/features/tracker/planning/planningDockLayout.util";
import { commonRoutes } from "@react-client/routing/common/routes";
import { kanbanBoardReleaseStatusTitle } from "@smart-anketa/api-contract";
import { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";

export function TrackerPlanningPage() {
	const { planningId = "" } = useParams();
	const { data, isLoading, error } = useKanbanBoardPlanning(planningId);
	const updateLayout = useUpdateKanbanBoardPlanningLayout();
	const dockRef = useRef<PlanningDockLayoutHandle>(null);
	const [presetOpen, setPresetOpen] = useState(false);
	const [replacePreset, setReplacePreset] = useState(false);
	const [panelsAnchor, setPanelsAnchor] = useState<null | HTMLElement>(null);

	const [layoutChosen, setLayoutChosen] = useState(false);

	const needsPreset = Boolean(
		data && !isPlanningDockLayout(data.layoutJson) && !layoutChosen,
	);

	const persistLayout = useCallback(
		(layoutJson: unknown) => {
			if (!planningId) return;
			updateLayout.mutate({
				id: planningId,
				data: { layoutJson },
			});
		},
		[planningId, updateLayout],
	);

	const missingPanels = useMemo(() => {
		return Object.entries(PLANNING_DOCK_PANEL_TITLES) as Array<
			[PlanningDockPanelId, string]
		>;
	}, []);

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
					{error ? apiErrorMessage(error) : "Планирование не найдено"}
				</Alert>
			</Flex>
		);
	}

	return (
		<PlanningWorkspaceProvider value={{ planning: data }}>
			<Flex flexDirection="column" height="100%" minHeight="0">
				<Header
					title={`${data.code} · ${data.name}`}
					backTo={commonRoutes.trackerPlannings.rootPath}
				>
					<Flex gap={8} alignItems="center">
						<span title="Статус релиза">
							{kanbanBoardReleaseStatusTitle(data.releaseStatus)}
						</span>
						<Button
							size="small"
							onClick={() => {
								setReplacePreset(true);
								setPresetOpen(true);
							}}
						>
							Макет
						</Button>
						<Button
							size="small"
							onClick={(event) => setPanelsAnchor(event.currentTarget)}
						>
							Панели
						</Button>
					</Flex>
				</Header>
				<Flex flexGrow={1} minHeight="0">
					<PlanningDockLayout
						ref={dockRef}
						layoutJson={data.layoutJson}
						needsPreset={needsPreset}
						onPersistLayout={persistLayout}
					/>
				</Flex>
			</Flex>
			<PlanningLayoutPresetDialog
				open={presetOpen || needsPreset}
				confirmReplace={replacePreset && !needsPreset}
				onClose={
					needsPreset
						? undefined
						: () => {
								setPresetOpen(false);
								setReplacePreset(false);
							}
				}
				onSelect={(preset) => {
					setLayoutChosen(true);
					dockRef.current?.applyPreset(preset);
					setPresetOpen(false);
					setReplacePreset(false);
				}}
			/>
			<Menu
				anchorEl={panelsAnchor}
				open={Boolean(panelsAnchor)}
				onClose={() => setPanelsAnchor(null)}
			>
				{missingPanels.map(([id, title]) => (
					<MenuItem
						key={id}
						onClick={() => {
							dockRef.current?.addPanel(id);
							setPanelsAnchor(null);
						}}
					>
						{title}
					</MenuItem>
				))}
			</Menu>
		</PlanningWorkspaceProvider>
	);
}
