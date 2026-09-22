import Dialog from "@mui/material/Dialog";
import { Flex } from "@react-client/common/primitives/Flex";
import { KanbanTaskPage } from "@react-client/features/kanban-board/pages/KanbanTaskPage";
import { openPlanningTaskFromClick } from "@react-client/features/tracker/planning/planningTaskLink";
import { useCallback, useRef } from "react";

export function PlanningTaskDialog({
	taskKey,
	onClose,
	onOpenTask,
}: {
	taskKey: string | null;
	onClose: () => void;
	onOpenTask: (taskKey: string) => void;
}) {
	const requestCloseRef = useRef<(() => void) | null>(null);
	const bindRequestClose = useCallback((requestClose: () => void) => {
		requestCloseRef.current = requestClose;
	}, []);

	return (
		<Dialog
			open={Boolean(taskKey)}
			onClose={() => {
				if (requestCloseRef.current) requestCloseRef.current();
				else onClose();
			}}
			fullWidth
			maxWidth={false}
			slotProps={{
				paper: {
					sx: {
						width: "min(1280px, calc(100% - 32px))",
						height: "calc(100% - 32px)",
						maxWidth: "none",
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
					},
				},
			}}
		>
			{taskKey ? (
				<Flex
					flexDirection="column"
					height="100%"
					minHeight="0"
					onClickCapture={(event) =>
						openPlanningTaskFromClick(event, onOpenTask)
					}
				>
					<KanbanTaskPage
						key={taskKey}
						taskKey={taskKey}
						onClose={onClose}
						onOpenTask={onOpenTask}
						bindRequestClose={bindRequestClose}
					/>
				</Flex>
			) : null}
		</Dialog>
	);
}
