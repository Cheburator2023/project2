import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { styled } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { BasicInfoForm } from "@react-client/features/anketaCRUD/organisms/BasicInfoForm";
import { CalculationResultTable } from "@react-client/features/anketaCRUD/organisms/CalculationResultTable";
import { ProjectAssessmentForm } from "@react-client/features/jsonFormGenerator/components/ProjectAssessmentForm";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";

export const AnketaCompareLayout = () => {
	const location = useLocation();
	const id1 = new URLSearchParams(window.location.search).get("id1");
	const id2 = new URLSearchParams(window.location.search).get("id2");

	return (
		<Flex flexDirection="column" width="100%">
			<Card header={`Основная информация ${id1} / ${id2}`} overflow={false}>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
				>
					<Panel>
						<BasicInfoForm />
					</Panel>

					<PanelResizeHandleStyled>
						<DragIndicatorIcon />
					</PanelResizeHandleStyled>

					<Panel>
						<BasicInfoForm />
					</Panel>
				</PanelGroup>
			</Card>

			<Spacer />

			<Card header={`Итоговый расчет ${id1} / ${id2}`} overflow={false}>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
				>
					<Panel>
						<CalculationResultTable />
					</Panel>

					<PanelResizeHandleStyled>
						<DragIndicatorIcon />
					</PanelResizeHandleStyled>

					<Panel>
						<CalculationResultTable />
					</Panel>
				</PanelGroup>
			</Card>

			<Spacer />

			<Card header={`Опросник ${id1} / ${id2}`} overflow={false}>
				<PanelGroup
					autoSaveId={`anketa_compare_page_container_hor_${location.pathname}`}
					direction="horizontal"
				>
					<Panel>
						<ProjectAssessmentForm />
					</Panel>

					<PanelResizeHandleStyled>
						<DragIndicatorIcon />
					</PanelResizeHandleStyled>

					<Panel>
						<ProjectAssessmentForm />
					</Panel>
				</PanelGroup>
			</Card>

			<Spacer />
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
