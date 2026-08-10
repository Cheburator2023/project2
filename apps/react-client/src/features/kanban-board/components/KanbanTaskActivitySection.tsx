import { useState } from "react";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { KanbanTaskCommentsSection } from "@react-client/features/kanban-board/components/KanbanTaskCommentsSection";
import { KanbanTaskHistorySection } from "@react-client/features/kanban-board/components/KanbanTaskHistorySection";

type ActivityTab = "comments" | "history";

type Props = {
	taskId: string;
	disabled?: boolean;
};

export function KanbanTaskActivitySection({ taskId, disabled }: Props) {
	const [tab, setTab] = useState<ActivityTab>("comments");

	return (
		<Flex flexDirection="column" gap={8}>
			<SegmentBar<ActivityTab>
				value={tab}
				onChange={setTab}
				data-test-id="kanban-task-activity-tabs"
				segments={[
					{
						id: "comments",
						label: "Комментарии",
						"data-test-id": "kanban-task-tab-comments",
					},
					{
						id: "history",
						label: "История",
						"data-test-id": "kanban-task-tab-history",
					},
				]}
			/>
			<Spacer space={4} />
			{tab === "comments" ? (
				<KanbanTaskCommentsSection taskId={taskId} disabled={disabled} />
			) : (
				<KanbanTaskHistorySection taskId={taskId} />
			)}
		</Flex>
	);
}
