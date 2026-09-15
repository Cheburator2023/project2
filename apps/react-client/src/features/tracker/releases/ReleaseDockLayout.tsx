import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useColorScheme } from "@mui/material/styles";
import {
	DockviewReact,
	themeDark,
	themeLight,
	type DockviewApi,
	type DockviewIDisposable,
	type DockviewReadyEvent,
	type IDockviewPanelProps,
} from "dockview-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flex } from "@react-client/common/primitives/Flex";
import { ReleaseSourceBoardPicker } from "@react-client/features/tracker/planning/panels/PlanningSourceBoardView";
import { ReleaseTasksPanel } from "@react-client/features/tracker/releases/ReleaseTasksPanel";
import { useReleaseWorkspace } from "@react-client/features/tracker/releases/ReleaseWorkspaceContext";
import {
	applyReleaseDockLayout,
	loadReleaseDockLayout,
	restoreReleaseDockLayout,
	saveReleaseDockLayout,
} from "@react-client/features/tracker/releases/releaseDockLayout.util";
import {
	layoutDockviewToContainer,
	useDockviewStableLayout,
} from "@react-client/features/tracker/planning/useDockviewStableLayout";

const LAYOUT_SAVE_DEBOUNCE_MS = 350;

function ReleaseBoardPanel() {
	const release = useReleaseWorkspace();
	return (
		<Flex flexDirection="column" height="100%" minHeight="0" padding="8px">
			<ReleaseSourceBoardPicker
				releaseId={release.id}
				attachedTaskIds={release.tasks.map((item) => item.taskId)}
				storageKey={`smart-anketa:release:${release.id}:sourceBoardKey`}
			/>
		</Flex>
	);
}

const panelComponents = {
	tasks: (_props: IDockviewPanelProps) => <ReleaseTasksPanel />,
	board: (_props: IDockviewPanelProps) => <ReleaseBoardPanel />,
};

function finishDockInitialization(
	api: DockviewApi,
	el: HTMLElement | null,
	onComplete: () => void,
) {
	requestAnimationFrame(() => {
		if (el) {
			layoutDockviewToContainer(api, el);
		}
		requestAnimationFrame(onComplete);
	});
}

export function ReleaseDockLayout({ releaseId }: { releaseId: string }) {
	const { mode } = useColorScheme();
	const [isDockReady, setIsDockReady] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dockApiRef = useRef<DockviewApi | null>(null);
	const layoutPersistenceReadyRef = useRef(false);
	const layoutSaveTimerRef = useRef<number | null>(null);
	const layoutChangeDisposableRef = useRef<DockviewIDisposable | null>(null);

	const dockTheme = useMemo(
		() => (mode === "dark" ? themeDark : themeLight),
		[mode],
	);

	useDockviewStableLayout(containerRef, dockApiRef);

	const schedulePersistLayout = useCallback(
		(api: DockviewApi) => {
			if (!layoutPersistenceReadyRef.current) return;
			if (layoutSaveTimerRef.current != null) {
				window.clearTimeout(layoutSaveTimerRef.current);
			}
			layoutSaveTimerRef.current = window.setTimeout(() => {
				saveReleaseDockLayout(releaseId, api.toJSON());
			}, LAYOUT_SAVE_DEBOUNCE_MS);
		},
		[releaseId],
	);

	const onReady = useCallback(
		(event: DockviewReadyEvent) => {
			dockApiRef.current = event.api;
			layoutChangeDisposableRef.current?.dispose();
			layoutChangeDisposableRef.current = event.api.onDidLayoutChange(() => {
				schedulePersistLayout(event.api);
			});

			layoutPersistenceReadyRef.current = false;
			setIsDockReady(false);

			const restored = restoreReleaseDockLayout(
				event.api,
				loadReleaseDockLayout(releaseId),
			);
			if (!restored) {
				applyReleaseDockLayout(event.api);
			}

			finishDockInitialization(event.api, containerRef.current, () => {
				layoutPersistenceReadyRef.current = true;
				setIsDockReady(true);
			});
		},
		[releaseId, schedulePersistLayout],
	);

	useEffect(() => {
		return () => {
			layoutChangeDisposableRef.current?.dispose();
			if (layoutSaveTimerRef.current != null) {
				window.clearTimeout(layoutSaveTimerRef.current);
			}
		};
	}, []);

	return (
		<Box
			ref={containerRef}
			sx={{
				position: "relative",
				height: "100%",
				width: "100%",
				minHeight: 0,
				overflow: "hidden",
				"& .dv-root": { height: "100%", width: "100%" },
				"& .dv-grid-view": { height: "100%" },
				"& .dv-split-view-container .dv-view-container .dv-view": {
					overflow: "hidden",
				},
				"& .dv-groupview > .dv-content-container": {
					position: "relative",
					flex: "1 1 0",
					minHeight: 0,
					overflow: "hidden",
				},
				"& .dv-react-part": {
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				},
				"& .dv-react-part > *": {
					flex: 1,
					minHeight: 0,
					height: "100%",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				},
			}}
		>
			{!isDockReady ? (
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						zIndex: 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						bgcolor: "background.default",
					}}
				>
					<CircularProgress size={32} />
				</Box>
			) : null}
			<Box sx={{ height: "100%", width: "100%" }}>
				<DockviewReact
					theme={dockTheme}
					components={panelComponents}
					floatingGroupBounds="boundedWithinViewport"
					onReady={onReady}
				/>
			</Box>
		</Box>
	);
}
