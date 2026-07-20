import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { V2LogicWorkspaceTab } from "@smart-anketa/api-contract";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { ParameterDependenciesPanel } from "./ParameterDependenciesPanel";
import { TypicalWorksPanelMountHost } from "./typicalWorksPanelPersistentMount";

export type LogicWorkspaceShellProps = {
	tab: V2LogicWorkspaceTab;
	onTabChange: (tab: V2LogicWorkspaceTab) => void;
	jsonLogicPanel: React.ReactNode;
};

const LOGIC_WORKSPACE_SEGMENTS: Array<{
	id: V2LogicWorkspaceTab;
	label: string;
	title?: string;
}> = [
	{ id: "works", label: "Типовые работы" },
	{
		id: "dependencies",
		label: "Зависимости параметров",
		title: "Связи значений параметров между собой",
	},
	// { id: "jsonlogic", label: "JsonLogic" },
];

export function LogicWorkspaceShell({
	tab,
	onTabChange,
	jsonLogicPanel,
}: LogicWorkspaceShellProps) {
	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: 0,
			}}
		>
			<Box
				sx={{
					flexShrink: 0,
					px: 2,
					py: 1.25,
					borderBottom: 1,
					borderColor: "divider",
					bgcolor: "background.paper",
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					flexWrap: "wrap",
				}}
			>
				<SegmentBar
					segments={LOGIC_WORKSPACE_SEGMENTS}
					value={tab}
					onChange={onTabChange}
				/>
				<Typography variant="caption" color="text.secondary">
					{tab === "works"
						? "Норматив · условия появления типовых работ · параметры трудоёмкости · формула"
						: tab === "dependencies"
							? "Зависимости между параметрами анкеты"
							: "Расширенный редактор JsonLogic-правил"}
				</Typography>
			</Box>

			<Box
				sx={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}
			>
				<Box
					sx={{
						display: tab === "works" ? "flex" : "none",
						flexDirection: "column",
						height: "100%",
						minHeight: 0,
					}}
				>
					<TypicalWorksPanelMountHost />
				</Box>
				{tab === "dependencies" ? <ParameterDependenciesPanel /> : null}
				{tab === "jsonlogic" ? (
					<Box sx={{ height: "100%", minHeight: 0 }}>{jsonLogicPanel}</Box>
				) : null}
			</Box>
		</Box>
	);
}
