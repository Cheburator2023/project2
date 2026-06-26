import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import {
	useKanbanBoardProjects,
	useKanbanBoardSprints,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { TrackerGanttChart } from "@react-client/features/tracker/gantt/TrackerGanttChart";
import "@react-client/features/tracker/gantt/trackerGantt.css";
import type { TrackerGanttFilters } from "@react-client/features/tracker/gantt/trackerGanttModel";
import {
	TRACKER_GANTT_SCALE_PRESET_DEFAULT,
	TRACKER_GANTT_SCALE_PRESETS,
	type TrackerGanttScalePresetId,
} from "@react-client/features/tracker/gantt/trackerGanttScalePresets";
import { useMemo, useState } from "react";

export function TrackerGanttPage() {
	const { data: projects = [] } = useKanbanBoardProjects();
	const { data: sprints = [] } = useKanbanBoardSprints();
	const [projectCode, setProjectCode] = useState("");
	const [sprintId, setSprintId] = useState("");
	const [scalePresetId, setScalePresetId] = useState<TrackerGanttScalePresetId>(
		TRACKER_GANTT_SCALE_PRESET_DEFAULT,
	);

	const sprintOptions = useMemo(
		() => [
			{ value: "", label: "Все спринты" },
			{ value: "unassigned", label: "Без спринта" },
			...sprints.map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
			})),
		],
		[sprints],
	);

	const filters = useMemo<TrackerGanttFilters>(
		() => ({
			projectCode: projectCode || undefined,
			sprintId: sprintId || undefined,
		}),
		[projectCode, sprintId],
	);

	return (
		<Box
			className="tracker-gantt-page-root"
			sx={{
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				minWidth: 0,
				width: "100%",
			}}
		>
			<Header title="Диаграмма Ганта">
				<Flex gap={8} wrap="wrap" alignItems="center">
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<Select
							displayEmpty
							value={projectCode}
							onChange={(event) => setProjectCode(event.target.value)}
							renderValue={(selected) => {
								if (!selected) {
									return (
										<Box component="span" sx={{ color: "text.secondary" }}>
											Проект
										</Box>
									);
								}
								const project = projects.find((item) => item.code === selected);
								return project
									? `${project.code} — ${project.name}`
									: String(selected);
							}}
						>
							<MenuItem value="">Все проекты</MenuItem>
							{projects.map((project) => (
								<MenuItem key={project.id} value={project.code}>
									{project.code} — {project.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 220 }}>
						<Select
							displayEmpty
							value={sprintId}
							onChange={(event) => setSprintId(event.target.value)}
							renderValue={(selected) => {
								if (!selected) {
									return (
										<Box component="span" sx={{ color: "text.secondary" }}>
											Спринт
										</Box>
									);
								}
								return (
									sprintOptions.find((option) => option.value === selected)
										?.label ?? String(selected)
								);
							}}
						>
							{sprintOptions.map((option) => (
								<MenuItem key={option.value || "all"} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 160 }}>
						<Select
							value={scalePresetId}
							onChange={(event) =>
								setScalePresetId(
									event.target.value as TrackerGanttScalePresetId,
								)
							}
						>
							{TRACKER_GANTT_SCALE_PRESETS.map((preset) => (
								<MenuItem key={preset.id} value={preset.id}>
									{preset.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Flex>
			</Header>
			<Box
				className="tracker-gantt-page-chart"
				sx={{
					minWidth: 0,
					width: "100%",
					maxWidth: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<TrackerGanttChart filters={filters} scalePresetId={scalePresetId} />
			</Box>
		</Box>
	);
}
