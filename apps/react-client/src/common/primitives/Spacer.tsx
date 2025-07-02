import { styled } from "@mui/material/styles";
import type React from "react";

const DEFAULT_SPACE = 20;
const DEFAULT_WIDTH = 10;

interface IProps {
	space?: number;
	height?: number;
	mobSpace?: number;
	width?: number;
	isMobile?: boolean;
}

export const Spacer: React.FC<IProps> = ({
	space,
	height = DEFAULT_SPACE,
	width = DEFAULT_WIDTH,
	mobSpace = DEFAULT_SPACE,
	isMobile = false,
	...rest
}) => (
	<InnerSpacer
		space={space || height}
		width={width}
		mobSpace={isMobile ? mobSpace : space}
		{...rest}
	/>
);

const InnerSpacer = styled("div")<IProps>`
  height: ${({ space }) => space}px;
  min-width: ${({ width }) => width}px;
  max-height: ${({ space }) => space}px;
  min-height: ${({ space }) => space}px;

  width: ${({ width }) => width}px;

  &:before {
    content: '${({ space }) => space}';
    display: none;
  }
`;
