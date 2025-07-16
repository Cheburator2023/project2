import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { styled } from "@mui/material";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { BasicInfoForm } from "@react-client/features/anketaCRUD/organisms/BasicInfoForm";
import { CalculationResultTable } from "@react-client/features/anketaCRUD/organisms/CalculationResultTable";
import { ProjectAssessmentFormPreview } from "@react-client/features/anketaCRUD/organisms/ProjectAssessmentFormPreview";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";
import { PanelResizeHandleStyled } from "../atoms/PanelResizeHandleStyled";

export const AnketaBasicLayoutPreview = ({
	initialData,
	comfyView,
	isEditing = false,
	isPending = false,
	mainInfoDisabled = true,
	onMainInfoChange,
}: {
	comfyView?: boolean;
	isEditing?: boolean;
	isPending?: boolean;
	initialData: CalculationResponseDto;
	mainInfoDisabled?: boolean;
	onMainInfoChange?: (data: any) => void;
}) => {
	const location = useLocation();

	return (
		<Flex
			flexDirection="column"
			height="100%"
			width="100%"
			data-test-id="anketa-basic-layout--Flex-0"
		>
			{comfyView ? (
				<PanelGroup
					autoSaveId={`anketa_${"preview"}_page_container_vert_${location.pathname}`}
					direction="vertical"
					data-test-id="anketa-basic-layout--PanelGroup-0"
				>
					<Panel data-test-id="anketa-basic-layout--Panel-3">
						<Card
							header="Основная информация"
							maxHeight="100%"
							height="100%"
							padding="10px"
							zoom={0.8}
							loading={isPending}
							uuid="anketa_project_assessment_card"
							data-test-id="anketa-basic-layout--Card-2"
						>
							<BasicInfoForm
								isEditing={isEditing}
								initialData={initialData}
								disabled={mainInfoDisabled}
								onChange={onMainInfoChange}
								data-test-id="anketa-basic-layout--BasicInfoForm-0"
							/>
						</Card>
					</Panel>
					<PanelResizeHandleStyled
						vertical
						data-test-id="anketa-basic-layout--PanelResizeHandleStyled-1"
					>
						<DragIndicatorIcon data-test-id="anketa-basic-layout--DragIndicatorIcon-1" />
					</PanelResizeHandleStyled>
					<Panel data-test-id="anketa-basic-layout--Panel-0">
						<PanelGroup
							direction="horizontal"
							autoSaveId={`anketa_${"preview"}_page_container_hor_${location.pathname}`}
							data-test-id="anketa-basic-layout--PanelGroup-1"
						>
							<Panel data-test-id="anketa-basic-layout--Panel-1">
								<Card
									header="Опросник"
									height="100%"
									padding="10px"
									zoom={0.8}
									uuid="anketa_basic_info_card"
									data-test-id="anketa-basic-layout--Card-0"
								>
									<ProjectAssessmentFormPreview
										initialData={initialData}
										data-test-id="anketa-basic-layout--ProjectAssessmentForm-0"
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
									zoom={0.8}
									uuid="anketa_calculation_result_card"
									data-test-id="anketa-basic-layout--Card-1"
								>
									<CalculationResultTable data-test-id="anketa-basic-layout--CalculationResultTable-0" />
								</Card>
							</Panel>
						</PanelGroup>
					</Panel>
				</PanelGroup>
			) : (
				<Flex flexDirection="column" gap={10}>
					<Card
						header="Основная информация"
						overflow={""}
						padding="10px"
						zoom={0.8}
						uuid="anketa_project_assessment_card"
						data-test-id="anketa-basic-layout--Card-2"
					>
						<BasicInfoForm
							initialData={initialData}
							disabled={mainInfoDisabled}
							onChange={onMainInfoChange}
							data-test-id="anketa-basic-layout--BasicInfoForm-0"
						/>
					</Card>
					<Card
						header="Опросник"
						overflow={""}
						padding="10px"
						zoom={0.8}
						uuid="anketa_basic_info_card"
						data-test-id="anketa-basic-layout--Card-0"
					>
						<ProjectAssessmentFormPreview
							initialData={initialData}
							data-test-id="anketa-basic-layout--ProjectAssessmentForm-0"
						/>
					</Card>
					<Card
						header="Итоги расчета"
						height="666px"
						overflow={"hidden"}
						padding="10px"
						zoom={0.8}
						uuid="anketa_calculation_result_card"
						data-test-id="anketa-basic-layout--Card-1"
					>
						<CalculationResultTable data-test-id="anketa-basic-layout--CalculationResultTable-0" />
					</Card>
				</Flex>
			)}
		</Flex>
	);
};
