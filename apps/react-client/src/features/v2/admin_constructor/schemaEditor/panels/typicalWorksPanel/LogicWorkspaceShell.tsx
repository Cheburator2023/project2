import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { V2LogicWorkspaceTab } from "@smart-anketa/api-contract";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { ParameterDependenciesPanel } from "./ParameterDependenciesPanel";
import { AtypicalWorksLogicPanel } from "./AtypicalWorksLogicPanel";
import { TypicalWorksPanelMountHost } from "./typicalWorksPanelPersistentMount";
import { OverallUncertaintyPanel } from "../overallUncertainty/OverallUncertaintyPanel";

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
	{ id: "atypicalWorks", label: "Нетиповые работы" },
	{
		id: "dependencies",
		label: "Зависимости параметров",
		title: "Связи значений параметров между собой",
	},
	{
		id: "uncertainty",
		label: "Общая неопределённость",
		title: "Шкалы, поправка и группа рисков (п.3 Опросника)",
	},
	// { id: "jsonlogic", label: "JsonLogic" },
];

export function LogicWorkspaceShell({
	tab,
	onTabChange,
	jsonLogicPanel,
}: LogicWorkspaceShellProps) {
	const hint =
		tab === "works"
			? "Норматив · условия появления типовых работ · параметры трудоёмкости · формула"
			: tab === "atypicalWorks"
				? "Стрим-исполнитель · роли блоков нетиповых работ"
				: tab === "dependencies"
					? "Зависимости между параметрами анкеты"
					: tab === "uncertainty"
						? "Шкалы Сроков/Стоимости, поправка и группа рисков — итоговый коэффициент п.3 Опросника"
						: "Расширенный редактор JsonLogic-правил";

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
					{hint}
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
				<Box
					sx={{
						display: tab === "atypicalWorks" ? "flex" : "none",
						flexDirection: "column",
						height: "100%",
						minHeight: 0,
					}}
				>
					<AtypicalWorksLogicPanel />
				</Box>
				<Box
					sx={{
						display: tab === "dependencies" ? "flex" : "none",
						flexDirection: "column",
						height: "100%",
						minHeight: 0,
					}}
				>
					{/* Keep mounted: иначе draft/flush теряются при смене сегмента. */}
					<ParameterDependenciesPanel />
				</Box>
				<Box
					sx={{
						display: tab === "uncertainty" ? "flex" : "none",
						flexDirection: "column",
						height: "100%",
						minHeight: 0,
					}}
				>
					{/* Keep mounted: иначе правки шкал не доживают до «Сохранить схему». */}
					<OverallUncertaintyPanel />
				</Box>
				{tab === "jsonlogic" ? (
					<Box sx={{ height: "100%", minHeight: 0 }}>{jsonLogicPanel}</Box>
				) : null}
			</Box>
		</Box>
	);
}
