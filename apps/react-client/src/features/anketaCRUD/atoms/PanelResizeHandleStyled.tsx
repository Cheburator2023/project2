import { PanelResizeHandle } from "react-resizable-panels";
import { styled } from "@mui/material";

export const PanelResizeHandleStyled = styled(PanelResizeHandle)<{
	vertical?: boolean;
	visible?: boolean;
}>`
	display: flex;
	justify-content: center;
	align-items: center;
	width: 8px;


	svg {
		${(props) => (props.vertical ? "transform: rotate(90deg); height: 100%;" : "width: 100%;")}
	}

	${(props) => props.vertical && "width: 100%; height: 8px;"}
`;
