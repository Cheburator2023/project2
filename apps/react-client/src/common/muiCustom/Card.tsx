import CloseIcon from "@mui/icons-material/Close";
import {
	Button,
	ButtonGroup,
	IconButton,
	Paper,
	type PaperProps,
	styled,
	Typography,
} from "@mui/material";
import { usePageLocalStorage } from "@react-client/common/hooks/usePageLocalStorage";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useState } from "react";

const headerH = 20;

const CardWithZoom = (props: CardWithZoomProps) => {
	const { maxHeight, overflow = "auto" } = props;
	const [visible, _setVisible] = useState(true);
	const {
		data: __zoom,
		setValue: setZoom,
		clearValue,
	} = usePageLocalStorage<string>(
		`ls_card_${props.uuid}`,
		(props.zoom || 1).toString(),
	);

	const _zoom = Number.parseFloat(__zoom || "1");

	const handler = () => {
		props.onClose();
	};

	const zoomHandler = (fract: number) => {
		setZoom((_zoom + fract).toString());
	};

	return (
		<MUIPaperStyled
			overflow={overflow}
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
		>
			{(props.header || props.onClose) && (
				<Flex
					justifyContent="space-between"
					alignItems="center"
					width="100%"
					as="header"
					style={{ height: `${headerH}px` }}
				>
					{props.header && (
						<Typography variant="body1">
							<b>{props.header}</b>
						</Typography>
					)}
					<ButtonGroup variant="text" size="small">
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
					{props.onClose && (
						<IconButton onClick={handler}>
							<CloseIcon />
						</IconButton>
					)}
				</Flex>
			)}
			{!!(props.header || props.onClose) && <Spacer space={6} />}
			<div
				style={{
					height: props.header
						? overflow
							? `calc(100% - ${headerH + 45}px)`
							: "inherit"
						: "inherit",
					width: "inherit",
					zoom: _zoom,
				}}
			>
				{props.children}
			</div>
		</MUIPaperStyled>
	);
};

const CardWithoutZoom = (props: BaseCardProps) => {
	const { maxHeight, overflow = "auto" } = props;
	const [visible, _setVisible] = useState(true);

	const handler = () => {
		props.onClose();
	};

	return (
		<MUIPaperStyled
			overflow={overflow}
			sx={{
				padding: props.padding || "10px 7px 10px 11px",
				maxHeight: maxHeight || "100%",
				height: props.height || "auto",
				width: props.width,
				display: visible ? "block" : "none",
				...props.sx,
			}}
			variant="outlined"
			{...props}
		>
			{(props.header || props.onClose) && (
				<Flex
					justifyContent="space-between"
					alignItems="center"
					width="100%"
					as="header"
					style={{ height: `${headerH}px` }}
				>
					{props.header && <Typography variant="h6">{props.header}</Typography>}
					{props.onClose && (
						<IconButton onClick={handler}>
							<CloseIcon />
						</IconButton>
					)}
				</Flex>
			)}
			{!!(props.header || props.onClose) && <Spacer space={6} />}
			<div
				style={{
					height: props.header
						? overflow
							? `calc(100% - ${headerH + 45}px)`
							: "inherit"
						: "inherit",
					width: "inherit",
				}}
			>
				{props.children}
			</div>
		</MUIPaperStyled>
	);
};

type BaseCardProps = PaperProps & {
	maxHeight?: string;
	height?: string;
	padding?: string;
	width?: string;
	header?: any;
	onClose?: any;
	overflow?: string;
};

type CardWithZoomProps = BaseCardProps & {
	zoom: number;
	uuid: string;
};

type CardWithoutZoomProps = BaseCardProps & {
	zoom?: never;
	uuid?: string;
};

type CardProps = CardWithZoomProps | CardWithoutZoomProps;

export const Card = (props: CardProps) => {
	if (props.zoom !== undefined && props.uuid) {
		return <CardWithZoom {...props} zoom={props.zoom} uuid={props.uuid} />;
	}
	return <CardWithoutZoom {...props} variant="outlined" />;
};

const MUIPaperStyled = styled(Paper)<{ overflow: string }>`
	pointer-events: all;
 & > div {
	overflow: ${({ overflow }) => overflow && "auto"};
 }
`;
