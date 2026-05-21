import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { styled } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { BasicInfoForm } from "@react-client/features/v1/anketaCRUD/organisms/BasicInfoForm";
import { CalculationResultTable } from "@react-client/features/v1/anketaCRUD/organisms/CalculationResultTable";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";
import { ProjectAssessmentForm } from "../../anketaCRUD/organisms/ProjectAssessmentForm";

export const AnketaCompareLayout = () => {
	const location = useLocation();
	const id1 = new URLSearchParams(window.location.search).get("id1");
	const id2 = new URLSearchParams(window.location.search).get("id2");

	return (
		<Flex
			flexDirection="column"
			width="100%"
			data-test-id="anketa-compare-layout--Flex-0"
		>
			<Card
				header={`Основная информация ${id1} / ${id2}`}
				overflow=""
				data-test-id="anketa-compare-layout--Card-0"
			>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
					data-test-id="anketa-compare-layout--PanelGroup-0"
				>
					<Panel data-test-id="anketa-compare-layout--Panel-0">
						<BasicInfoForm data-test-id="anketa-compare-layout--BasicInfoForm-0" />
					</Panel>
					<PanelResizeHandleStyled data-test-id="anketa-compare-layout--PanelResizeHandleStyled-0">
						<DragIndicatorIcon data-test-id="anketa-compare-layout--DragIndicatorIcon-0" />
					</PanelResizeHandleStyled>
					<Panel data-test-id="anketa-compare-layout--Panel-1">
						<BasicInfoForm data-test-id="anketa-compare-layout--BasicInfoForm-1" />
					</Panel>
				</PanelGroup>
			</Card>
			<Spacer data-test-id="anketa-compare-layout--Spacer-0" />
			<Card
				header={`Итоговый расчет ${id1} / ${id2}`}
				overflow=""
				data-test-id="anketa-compare-layout--Card-1"
			>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
					data-test-id="anketa-compare-layout--PanelGroup-1"
				>
					<Panel data-test-id="anketa-compare-layout--Panel-2">
						<CalculationResultTable data-test-id="anketa-compare-layout--CalculationResultTable-0" />
					</Panel>
					<PanelResizeHandleStyled data-test-id="anketa-compare-layout--PanelResizeHandleStyled-1">
						<DragIndicatorIcon data-test-id="anketa-compare-layout--DragIndicatorIcon-1" />
					</PanelResizeHandleStyled>
					<Panel data-test-id="anketa-compare-layout--Panel-3">
						<CalculationResultTable data-test-id="anketa-compare-layout--CalculationResultTable-1" />
					</Panel>
				</PanelGroup>
			</Card>
			<Spacer data-test-id="anketa-compare-layout--Spacer-1" />
			<Card
				header={`Опросник ${id1} / ${id2}`}
				overflow=""
				data-test-id="anketa-compare-layout--Card-2"
			>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
					data-test-id="anketa-compare-layout--PanelGroup-2"
				>
					<Panel data-test-id="anketa-compare-layout--Panel-4">
						<ProjectAssessmentForm data-test-id="anketa-compare-layout--ProjectAssessmentForm-0" />
					</Panel>
					<PanelResizeHandleStyled data-test-id="anketa-compare-layout--PanelResizeHandleStyled-2">
						<DragIndicatorIcon data-test-id="anketa-compare-layout--DragIndicatorIcon-2" />
					</PanelResizeHandleStyled>
					<Panel data-test-id="anketa-compare-layout--Panel-5">
						<ProjectAssessmentForm data-test-id="anketa-compare-layout--ProjectAssessmentForm-1" />
					</Panel>
				</PanelGroup>
			</Card>
		</Flex>
	);
};

const PanelResizeHandleStyled = styled(PanelResizeHandle)<{
	vertical?: boolean;
	visible?: boolean;
}>`
	display: flex;
	justify-content: center;
	align-items: center;
	width: 18px;


	svg {
		${(props) => (props.vertical ? "transform: rotate(90deg); height: 100%;" : "width: 100%;")}
	}

	${(props) => props.vertical && "width: 100%; height: 18px;"}
`;
