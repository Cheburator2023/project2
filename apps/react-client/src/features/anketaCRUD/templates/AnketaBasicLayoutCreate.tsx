import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";
import { BasicInfoForm } from "../organisms/BasicInfoForm";
import { CalculationResultTable } from "../organisms/CalculationResultTable";
import { ProjectAssessmentForm } from "../organisms/ProjectAssessmentForm";
import { PanelResizeHandleStyled } from "../atoms/PanelResizeHandleStyled";

export const AnketaBasicLayoutCreate = ({
	isPending,
}: {
	isPending?: boolean;
}) => {
	const location = useLocation();

	return (
		<Flex
			flexDirection="column"
			height="100%"
			width="100%"
			data-test-id="anketa-basic-layout--Flex-0"
		>
			<PanelGroup
				autoSaveId={`anketa_${"create"}_page_container_vert_${location.pathname}`}
				direction="vertical"
				data-test-id="anketa-basic-layout--PanelGroup-0"
			>
				<Panel data-test-id="anketa-basic-layout--Panel-0">
					<PanelGroup
						direction="horizontal"
						autoSaveId={`anketa_${"create"}_page_container_hor_${location.pathname}`}
						data-test-id="anketa-basic-layout--PanelGroup-1"
					>
						<Panel data-test-id="anketa-basic-layout--Panel-1">
							<Card
								loading={isPending}
								header="Основная информация"
								height="100%"
								padding="10px"
								zoom={0.7}
								uuid="anketa_basic_info_card"
								data-test-id="anketa-basic-layout--Card-0"
							>
								<BasicInfoForm
									isCreate
									data-test-id="anketa-basic-layout--BasicInfoForm-0"
								/>
							</Card>
						</Panel>
						<PanelResizeHandleStyled data-test-id="anketa-basic-layout--PanelResizeHandleStyled-0">
							<DragIndicatorIcon data-test-id="anketa-basic-layout--DragIndicatorIcon-0" />
						</PanelResizeHandleStyled>
						<Panel data-test-id="anketa-basic-layout--Panel-2">
							<Card
								loading={isPending}
								header="Итоги расчета"
								maxHeight="100%"
								height="100%"
								padding="10px"
								zoom={0.7}
								uuid="anketa_calculation_result_card"
								data-test-id="anketa-basic-layout--Card-1"
							>
								<CalculationResultTable data-test-id="anketa-basic-layout--CalculationResultTable-0" />
							</Card>
						</Panel>
					</PanelGroup>
				</Panel>
				<PanelResizeHandleStyled
					vertical
					data-test-id="anketa-basic-layout--PanelResizeHandleStyled-1"
				>
					<DragIndicatorIcon data-test-id="anketa-basic-layout--DragIndicatorIcon-1" />
				</PanelResizeHandleStyled>
				<Panel data-test-id="anketa-basic-layout--Panel-3">
					<Card
						loading={isPending}
						header="Опросник"
						maxHeight="100%"
						height="100%"
						padding="10px"
						zoom={0.7}
						uuid="anketa_project_assessment_card"
						data-test-id="anketa-basic-layout--Card-2"
					>
						<ProjectAssessmentForm
							isCreate
							data-test-id="anketa-basic-layout--ProjectAssessmentForm-0"
						/>
					</Card>
				</Panel>
			</PanelGroup>
		</Flex>
	);
};
