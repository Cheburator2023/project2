import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { styled } from "@mui/material";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { BasicInfoFormPreview } from "@react-client/features/anketaCRUD/organisms/BasicInfoFormPreview";
import { ProjectAssessmentForm } from "@react-client/features/jsonFormGenerator/components/ProjectAssessmentForm";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";

export const AnketaBasicLayoutPreview = ({
	isPending,
	onSubmit,
	formHasErrors,
	initialData,
}: {
	isPending?: boolean;
	formHasErrors?: boolean;
	onSubmit?: () => void;
	initialData: CalculationResponseDto;
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
				autoSaveId={`anketa_${"preview"}_page_container_vert_${location.pathname}`}
				direction="vertical"
				data-test-id="anketa-basic-layout--PanelGroup-0"
			>
				<Panel data-test-id="anketa-basic-layout--Panel-0">
					<PanelGroup
						direction="horizontal"
						autoSaveId={`anketa_${"preview"}_page_container_hor_${location.pathname}`}
						data-test-id="anketa-basic-layout--PanelGroup-1"
					>
						<Panel data-test-id="anketa-basic-layout--Panel-1">
							<Card
								header="Основная информация"
								height="100%"
								padding="10px"
								zoom={0.7}
								uuid="anketa_basic_info_card"
								data-test-id="anketa-basic-layout--Card-0"
							>
								<Spacer data-test-id="anketa-basic-layout--Spacer-0" />
								<BasicInfoFormPreview
									initialData={initialData}
									data-test-id="anketa-basic-layout--BasicInfoForm-0"
								/>
							</Card>
						</Panel>
						<PanelResizeHandleStyled data-test-id="anketa-basic-layout--PanelResizeHandleStyled-0">
							<DragIndicatorIcon data-test-id="anketa-basic-layout--DragIndicatorIcon-0" />
						</PanelResizeHandleStyled>
						<Panel data-test-id="anketa-basic-layout--Panel-2">
							<Card
								header="Итоги расчета"
								maxHeight="100%"
								height="100%"
								padding="10px"
								zoom={0.7}
								uuid="anketa_calculation_result_card"
								data-test-id="anketa-basic-layout--Card-1"
							>
								<Spacer data-test-id="anketa-basic-layout--Spacer-1" />
								{/* <CalculationResultTable
									data-test-id="anketa-basic-layout--CalculationResultTable-0"
								/> */}
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
						header="Опросник"
						maxHeight="100%"
						height="100%"
						padding="10px"
						zoom={0.7}
						uuid="anketa_project_assessment_card"
						data-test-id="anketa-basic-layout--Card-2"
					>
						<Spacer data-test-id="anketa-basic-layout--Spacer-2" />
						<ProjectAssessmentForm data-test-id="anketa-basic-layout--ProjectAssessmentForm-0" />
					</Card>
				</Panel>
			</PanelGroup>
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
	width: 12px;


	svg {
		${(props) => (props.vertical ? "transform: rotate(90deg); height: 100%;" : "width: 100%;")}
	}

	${(props) => props.vertical && "width: 100%; height: 12px;"}
`;
