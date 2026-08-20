import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardRelease,
} from "@react-client/common/api/queries/kanban-board";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import {
	KANBAN_BOARD_RELEASE_STATUSES,
	type KanbanBoardReleaseStatusId,
} from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

export function PlanningReleasePanel() {
	const { planning } = usePlanningWorkspace();
	const release = planning.release;
	const { data: sprints = [] } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const updateRelease = useUpdateKanbanBoardRelease();

	const [name, setName] = useState(release.name);
	const [status, setStatus] = useState<KanbanBoardReleaseStatusId>(release.status);
	const [startDate, setStartDate] = useState(release.startDate ?? "");
	const [endDate, setEndDate] = useState(release.endDate ?? "");
	const [supersprintId, setSupersprintId] = useState(release.supersprintId ?? "");
	const [sprintId, setSprintId] = useState(release.sprintId ?? "");

	useEffect(() => {
		setName(release.name);
		setStatus(release.status);
		setStartDate(release.startDate ?? "");
		setEndDate(release.endDate ?? "");
		setSupersprintId(release.supersprintId ?? "");
		setSprintId(release.sprintId ?? "");
	}, [release]);

	const saveRelease = async () => {
		try {
			await updateRelease.mutateAsync({
				id: release.id,
				data: {
					name,
					status,
					startDate: startDate || null,
					endDate: endDate || null,
					supersprintId: supersprintId || null,
					sprintId: sprintId || null,
				},
			});
			toast.success("Релиз сохранён");
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="12px"
			style={{ overflow: "auto" }}
		>
			<Typography variant="subtitle2">
				{release.code} · {release.name}
			</Typography>
			<Spacer space={8} />
			<TextField
				size="small"
				label="Название"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			<Spacer space={8} />
			<TextField
				size="small"
				select
				label="Статус"
				value={status}
				onChange={(event) =>
					setStatus(event.target.value as KanbanBoardReleaseStatusId)
				}
			>
				{KANBAN_BOARD_RELEASE_STATUSES.map((item) => (
					<MenuItem key={item.id} value={item.id}>
						{item.title}
					</MenuItem>
				))}
			</TextField>
			<Spacer space={8} />
			<Flex gap={8}>
				<TextField
					size="small"
					type="date"
					label="Начало"
					InputLabelProps={{ shrink: true }}
					value={startDate}
					onChange={(event) => setStartDate(event.target.value)}
				/>
				<TextField
					size="small"
					type="date"
					label="Окончание"
					InputLabelProps={{ shrink: true }}
					value={endDate}
					onChange={(event) => setEndDate(event.target.value)}
				/>
			</Flex>
			<Spacer space={8} />
			<TextField
				size="small"
				select
				label="Суперспринт"
				value={supersprintId}
				onChange={(event) => setSupersprintId(event.target.value)}
			>
				<MenuItem value="">—</MenuItem>
				{supersprints.map((item) => (
					<MenuItem key={item.id} value={item.id}>
						{item.code} — {item.name}
					</MenuItem>
				))}
			</TextField>
			<Spacer space={8} />
			<TextField
				size="small"
				select
				label="Спринт"
				value={sprintId}
				onChange={(event) => setSprintId(event.target.value)}
			>
				<MenuItem value="">—</MenuItem>
				{sprints.map((item) => (
					<MenuItem key={item.id} value={item.id}>
						{item.code} — {item.name}
					</MenuItem>
				))}
			</TextField>
			<Spacer space={8} />
			<Button variant="contained" onClick={() => void saveRelease()}>
				Сохранить релиз
			</Button>
		</Flex>
	);
}
