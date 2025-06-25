import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Button, styled } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { ProjectAssessmentForm } from "@react-client/features/jsonFormGenerator/components/ProjectAssessmentForm";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLocation } from "react-router";
import { BasicInfoForm } from "./BasicInfoForm";
import { CalculationResultTable } from "./CalculationResultTable";

export const AnketaBasicLayout = ({
	isCreate = false,
	isCopy,
	onSubmit,
	formHasErrors,
}: {
	isCreate?: boolean;
	isCopy?: boolean;
	formHasErrors?: boolean;
	onSubmit?: () => void;
}) => {
	const location = useLocation();

	return (
		<Flex flexDirection="column" height="100%" width="100%">
			<PanelGroup
				autoSaveId={`anketa_${isCreate ? "create" : "preview"}_page_container_vert_${location.pathname}`}
				direction="vertical"
			>
				<Panel>
					<PanelGroup
						direction="horizontal"
						autoSaveId={`anketa_${isCreate ? "create" : "preview"}_page_container_hor_${location.pathname}`}
					>
						<Panel>
							<Card header="Основная информация" height="100%" padding="10px">
								<Spacer />
								<BasicInfoForm isCreate={isCreate} />
							</Card>
						</Panel>

						<PanelResizeHandleStyled>
							<DragIndicatorIcon />
						</PanelResizeHandleStyled>

						<Panel>
							<Card
								header="Итоги расчета"
								maxHeight="100%"
								height="100%"
								padding="10px"
							>
								<Spacer />
								<CalculationResultTable isCreate={isCreate} />
							</Card>
						</Panel>
					</PanelGroup>
				</Panel>

				<PanelResizeHandleStyled vertical>
					<DragIndicatorIcon />
				</PanelResizeHandleStyled>

				<Panel>
					<Card header="Опросник" maxHeight="100%" height="100%" padding="10px">
						<Spacer />
						<ProjectAssessmentForm isCreate={isCreate} />
					</Card>
				</Panel>
			</PanelGroup>

			{isCreate && (
				<>
					<Spacer />
					<Card padding="10px">
						<Flex justifyContent="flex-end" alignItems="center">
							<Button variant="contained" onClick={onSubmit}>
								Сохранить
							</Button>
						</Flex>
					</Card>
				</>
			)}
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
