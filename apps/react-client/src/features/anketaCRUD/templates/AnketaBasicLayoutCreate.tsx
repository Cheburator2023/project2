import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Alert, Button, styled } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { ProjectAssessmentForm } from "@react-client/features/jsonFormGenerator/components/ProjectAssessmentForm";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";
import { BasicInfoForm } from "../organisms/BasicInfoForm";
import { CalculationResultTable } from "../organisms/CalculationResultTable";

export const AnketaBasicLayoutCreate = ({
	isPending,
	onSubmit,
	formHasErrors,
}: {
	isPending?: boolean;
	formHasErrors?: boolean;
	onSubmit?: () => void;
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
								<Spacer data-test-id="anketa-basic-layout--Spacer-0" />
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
								<Spacer data-test-id="anketa-basic-layout--Spacer-1" />
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
						<Spacer data-test-id="anketa-basic-layout--Spacer-2" />
						<ProjectAssessmentForm
							isCreate
							data-test-id="anketa-basic-layout--ProjectAssessmentForm-0"
						/>
					</Card>
				</Panel>
			</PanelGroup>

			<Spacer space={6} data-test-id="anketa-basic-layout--Spacer-3" />
			<Card padding="10px" data-test-id="anketa-basic-layout--Card-3">
				<Flex
					justifyContent="flex-end"
					alignItems="center"
					data-test-id="anketa-basic-layout--Flex-1"
					gap={6}
				>
					{/* {formHasErrors && (
						<Alert severity="error">
							Форма имеет ошибки или заполнена не до конца
						</Alert>
					)} */}
					<Button
						variant="contained"
						onClick={onSubmit}
						loading={isPending}
						data-test-id="anketa-basic-layout--Button-0"
					>
						Сохранить
					</Button>
				</Flex>
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
	width: 12px;


	svg {
		${(props) => (props.vertical ? "transform: rotate(90deg); height: 100%;" : "width: 100%;")}
	}

	${(props) => props.vertical && "width: 100%; height: 12px;"}
`;
