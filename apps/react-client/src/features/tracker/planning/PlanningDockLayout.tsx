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
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { PlanningBoardPanel } from "./panels/PlanningBoardPanel";
import { PlanningReleasePanel } from "./panels/PlanningReleasePanel";
import { PlanningTasksPanel } from "./panels/PlanningTasksPanel";
import { PlanningTimelinePanel } from "./panels/PlanningTimelinePanel";
import {
	addPlanningDockPanel,
	applyPlanningDockPreset,
	restorePlanningDockLayout,
	type PlanningDockPanelId,
	type PlanningLayoutPresetId,
} from "./planningDockLayout.util";
import {
	layoutDockviewToContainer,
	useDockviewStableLayout,
} from "./useDockviewStableLayout";

const LAYOUT_SAVE_DEBOUNCE_MS = 350;

const panelComponents = {
	tasks: (_props: IDockviewPanelProps) => <PlanningTasksPanel />,
	board: (_props: IDockviewPanelProps) => <PlanningBoardPanel />,
	timeline: (_props: IDockviewPanelProps) => <PlanningTimelinePanel />,
	release: (_props: IDockviewPanelProps) => <PlanningReleasePanel />,
};

export type PlanningDockLayoutHandle = {
	applyPreset: (preset: PlanningLayoutPresetId) => void;
	addPanel: (panelId: PlanningDockPanelId) => void;
};

type Props = {
	layoutJson: unknown | null;
	onPersistLayout: (layoutJson: unknown) => void;
	needsPreset: boolean;
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

export const PlanningDockLayout = forwardRef<PlanningDockLayoutHandle, Props>(
	function PlanningDockLayout(
		{ layoutJson, onPersistLayout, needsPreset },
		ref,
	) {
		const { mode } = useColorScheme();
		const [isDockReady, setIsDockReady] = useState(false);
		const containerRef = useRef<HTMLDivElement | null>(null);
		const dockApiRef = useRef<DockviewApi | null>(null);
		const layoutPersistenceReadyRef = useRef(false);
		const layoutSaveTimerRef = useRef<number | null>(null);
		const layoutChangeDisposableRef = useRef<DockviewIDisposable | null>(null);
		const persistRef = useRef(onPersistLayout);
		persistRef.current = onPersistLayout;
		const layoutJsonRef = useRef(layoutJson);
		layoutJsonRef.current = layoutJson;
		const needsPresetRef = useRef(needsPreset);
		needsPresetRef.current = needsPreset;
		const pendingPresetRef = useRef<PlanningLayoutPresetId | null>(null);

		const dockTheme = useMemo(
			() => (mode === "dark" ? themeDark : themeLight),
			[mode],
		);

		useDockviewStableLayout(containerRef, dockApiRef);

		const schedulePersistLayout = useCallback((api: DockviewApi) => {
			if (!layoutPersistenceReadyRef.current) return;
			if (layoutSaveTimerRef.current != null) {
				window.clearTimeout(layoutSaveTimerRef.current);
			}
			layoutSaveTimerRef.current = window.setTimeout(() => {
				persistRef.current(api.toJSON());
			}, LAYOUT_SAVE_DEBOUNCE_MS);
		}, []);

		const applyPresetToApi = (api: DockviewApi, preset: PlanningLayoutPresetId) => {
			layoutPersistenceReadyRef.current = false;
			setIsDockReady(false);
			applyPlanningDockPreset(api, preset);
			finishDockInitialization(api, containerRef.current, () => {
				layoutPersistenceReadyRef.current = true;
				setIsDockReady(true);
				persistRef.current(api.toJSON());
			});
		};

		useImperativeHandle(ref, () => ({
			applyPreset: (preset) => {
				const api = dockApiRef.current;
				if (!api) {
					pendingPresetRef.current = preset;
					return;
				}
				applyPresetToApi(api, preset);
			},
			addPanel: (panelId) => {
				const api = dockApiRef.current;
				if (!api) return;
				addPlanningDockPanel(api, panelId);
			},
		}));

		const onReady = useCallback(
			(event: DockviewReadyEvent) => {
				dockApiRef.current = event.api;
				layoutChangeDisposableRef.current?.dispose();
				layoutChangeDisposableRef.current = event.api.onDidLayoutChange(() => {
					schedulePersistLayout(event.api);
				});

				layoutPersistenceReadyRef.current = false;
				setIsDockReady(false);

				const pending = pendingPresetRef.current;
				if (pending) {
					pendingPresetRef.current = null;
					applyPresetToApi(event.api, pending);
					return;
				}

				const restored =
					!needsPresetRef.current &&
					restorePlanningDockLayout(event.api, layoutJsonRef.current);
				if (!restored && !needsPresetRef.current) {
					applyPlanningDockPreset(event.api, "roadmap");
				}

				if (event.api.totalPanels > 0) {
					finishDockInitialization(event.api, containerRef.current, () => {
						layoutPersistenceReadyRef.current = true;
						setIsDockReady(true);
					});
				} else {
					setIsDockReady(true);
				}
			},
			[schedulePersistLayout],
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
						flex: "1 1 0",
						minHeight: 0,
						overflow: "hidden",
					},
					"& .dv-react-part": {
						display: "flex",
						flexDirection: "column",
						height: "100%",
						minHeight: 0,
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
				<Box
					sx={{
						height: "100%",
						width: "100%",
						visibility: isDockReady || needsPreset ? "visible" : "hidden",
					}}
				>
					<DockviewReact
						theme={dockTheme}
						components={panelComponents}
						floatingGroupBounds="boundedWithinViewport"
						onReady={onReady}
					/>
				</Box>
			</Box>
		);
	},
);
