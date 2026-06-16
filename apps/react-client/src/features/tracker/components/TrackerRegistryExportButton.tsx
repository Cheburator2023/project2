import {
	downloadBlob,
	kanbanBoardExportSprintsRegistry,
	kanbanBoardExportSupersprintsRegistry,
	kanbanBoardExportTasksRegistry,
} from "@react-client/common/api/queries/kanban-board";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { useState } from "react";

type ExportKind = "tasks" | "sprints" | "supersprints";

const EXPORT_HANDLERS: Record<ExportKind, () => Promise<Blob>> = {
	tasks: () => kanbanBoardExportTasksRegistry(),
	sprints: () => kanbanBoardExportSprintsRegistry(),
	supersprints: () => kanbanBoardExportSupersprintsRegistry(),
};

const FILENAME_PREFIX: Record<ExportKind, string> = {
	tasks: "tracker-tasks",
	sprints: "tracker-sprints",
	supersprints: "tracker-supersprints",
};

type Props = {
	kind: ExportKind;
};

export function TrackerRegistryExportButton({ kind }: Props) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const blob = await EXPORT_HANDLERS[kind]();
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(blob, `${FILENAME_PREFIX[kind]}-${date}.xlsx`);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<V2AdminButton
			variant="outlined"
			disabled={isExporting}
			onClick={() => void handleExport()}
		>
			{isExporting ? "Экспорт…" : "Экспорт XLSX"}
		</V2AdminButton>
	);
}
