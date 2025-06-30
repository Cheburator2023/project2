import CloseIcon from "@mui/icons-material/Close";
import {
	Button,
	ButtonGroup,
	IconButton,
	Paper,
	type PaperProps,
	Typography,
	styled,
} from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useState } from "react";

const headerH = 30;

export const Card = (
	props: PaperProps & {
		maxHeight?: string;
		height?: string;
		padding?: string;
		width?: string;
		header?: any;
		onClose?: any;
		overflow?: boolean;
		zoom?: number;
	},
) => {
	const { maxHeight, overflow = true } = props;
	const [visible, setVisible] = useState(true);
	const [_zoom, setZoom] = useState(props.zoom || 1);

	const handler = () => {
		props.onClose();
	};

	const zoomHandler = (fract: number) => {
		setZoom(_zoom + fract);
	};

	return (
		<MUIPaperStyled
			sx={{
				padding: props.padding || "10px",
				maxHeight: maxHeight || "100%",
				height: props.height || "auto",
				width: props.width,
				display: visible ? "block" : "none",
				...props.sx,
			}}
			variant="outlined"
			{...props}
			data-test-id="card--MUIPaperStyled-0"
		>
			{(props.header || props.onClose) && (
				<Flex
					justifyContent="space-between"
					alignItems="center"
					width="100%"
					as="header"
					style={{ height: `${headerH}px` }}
					data-test-id="card--Flex-0"
				>
					{props.header && (
						<Typography variant="h6" data-test-id="card--Typography-0">
							{props.header}
						</Typography>
					)}
					{props.zoom && (
						<ButtonGroup variant="outlined" size="small">
							<Button
								onClick={() => zoomHandler(-0.1)}
								sx={{
									minWidth: "30px !important",
									height: "26px",
								}}
							>
								<b>-</b>
							</Button>
							<Button
								onClick={() => zoomHandler(0.1)}
								sx={{
									minWidth: "30px !important",
									height: "26px",
								}}
							>
								<b>+</b>
							</Button>
						</ButtonGroup>
					)}
					{props.onClose && (
						<IconButton onClick={handler} data-test-id="card--IconButton-0">
							<CloseIcon data-test-id="card--CloseIcon-0" />
						</IconButton>
					)}
				</Flex>
			)}
			{!!(props.header || props.onClose) && <Spacer />}
			<div
				style={{
					height: props.header
						? overflow
							? `calc(100% - ${headerH + 15}px)`
							: "inherit"
						: "inherit",
					width: "inherit",
					zoom: _zoom,
				}}
				data-test-id="card--div-0"
			>
				{props.children}
			</div>
		</MUIPaperStyled>
	);
};

const MUIPaperStyled = styled(Paper)<any>`
	pointer-events: all;
 & > div {
	overflow: auto;
 }
`;
