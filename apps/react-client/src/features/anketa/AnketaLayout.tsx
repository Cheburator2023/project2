import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Button, styled } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";

import { JsonFormGenerator } from "@react-client/features/jsonFormGenerator/JsonFormGenerator";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { BasicInfoForm } from "./organisms/BasicInfoForm";
import { CalculationResultTable } from "./organisms/CalculationResultTable";

export const AnketaLayout = ({ isCreate }: { isCreate?: boolean }) => {
	return (
		<Flex flexDirection="column" height="100%" width="100%">
			<PanelGroup
				autoSaveId="anketa_create_page_container_ver"
				direction="vertical"
			>
				<Panel>
					<PanelGroup
						direction="horizontal"
						autoSaveId="anketa_create_page_container_hor"
					>
						<Panel>
							<Card header="Основная информация" height="100%">
								<Spacer />
								<BasicInfoForm />
							</Card>
						</Panel>

						<PanelResizeHandleStyled>
							<DragIndicatorIcon />
						</PanelResizeHandleStyled>

						<Panel>
							<Card header="Итоги расчета" maxHeight="100%" height="100%">
								<CalculationResultTable />
							</Card>
						</Panel>
					</PanelGroup>
				</Panel>

				<PanelResizeHandleStyled vertical>
					<DragIndicatorIcon />
				</PanelResizeHandleStyled>

				<Panel>
					<Card header="Опросник" maxHeight="100%" height="100%">
						<JsonFormGenerator />
					</Card>
				</Panel>
			</PanelGroup>
			{isCreate && (
				<>
					<Spacer />
					<Card>
						<Flex justifyContent="space-between">
							<div />
							<Button variant="contained">Сохранить</Button>
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
