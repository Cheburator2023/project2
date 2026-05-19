import CloseIcon from "@mui/icons-material/Close";
import {
	Button,
	ButtonGroup,
	CircularProgress,
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

type BaseCardProps = PaperProps & {
	maxHeight?: string;
	height?: string;
	padding?: string;
	width?: string;
	header?: any;
	onClose?: any;
	overflow?: string;
	nonClickable?: boolean;
};

type CardWithZoomProps = BaseCardProps & {
	zoom: number;
	uuid: string;
	loading?: boolean;
};

type CardWithoutZoomProps = BaseCardProps & {
	zoom?: never;
	uuid?: string;
};

type CardProps = CardWithZoomProps | CardWithoutZoomProps;

/** Пропсы Card, которые не должны попадать на MUI Paper. */
function pickPaperProps({
	maxHeight: _maxHeight,
	height: _height,
	padding: _padding,
	width: _width,
	header: _header,
	onClose: _onClose,
	overflow: _overflow,
	nonClickable: _nonClickable,
	zoom: _zoom,
	uuid: _uuid,
	loading: _loading,
	children: _children,
	sx: _sx,
	...paperProps
}: BaseCardProps & { zoom?: number; uuid?: string; loading?: boolean }) {
	return paperProps;
}

const CardWithZoom = (props: CardWithZoomProps) => {
	const {
		maxHeight,
		overflow = "auto",
		loading = false,
		padding,
		height,
		width,
		header,
		onClose,
		nonClickable,
		children,
		sx,
	} = props;
	const paperProps = pickPaperProps(props);
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
		onClose?.();
	};

	const zoomHandler = (fract: number) => {
		setZoom((_zoom + fract).toString());
	};

	return (
		<MUIPaperStyled
			overflow={overflow}
			variant="outlined"
			{...paperProps}
			sx={{
				padding: padding ?? "10px",
				maxHeight: maxHeight ?? "100%",
				height: height ?? "auto",
				width,
				display: visible ? "block" : "none",
				...sx,
			}}
		>
			{loading && (
				<LoadingOverlay>
					<CircularProgress size={40} />
				</LoadingOverlay>
			)}
			{(header || onClose) && (
				<Flex
					justifyContent="space-between"
					alignItems="center"
					width="100%"
					as="header"
					style={{ height: `${headerH}px` }}
				>
					{header && (
						<Typography variant="body1">
							<b>{header}</b>
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
					{onClose && (
						<IconButton onClick={handler}>
							<CloseIcon />
						</IconButton>
					)}
				</Flex>
			)}
			{!!(header || onClose) && <Spacer space={6} />}
			<Wrapper
				nonClickable={!!nonClickable}
				style={{
					height: header
						? overflow
							? `calc(100% - ${headerH + 45}px)`
							: "inherit"
						: "inherit",
					width: "inherit",
					zoom: _zoom,
				}}
			>
				{children}
			</Wrapper>
		</MUIPaperStyled>
	);
};

const Wrapper = styled("div")<{ nonClickable: boolean }>`

	& > * {
		pointer-events: ${({ nonClickable }) => nonClickable && "none"};
	}
	
					`;

const CardWithoutZoom = (props: BaseCardProps) => {
	const {
		maxHeight,
		overflow = "auto",
		padding,
		height,
		width,
		header,
		onClose,
		nonClickable,
		children,
		sx,
	} = props;
	const paperProps = pickPaperProps(props);
	const [visible, _setVisible] = useState(true);

	const handler = () => {
		onClose?.();
	};

	return (
		<MUIPaperStyled
			overflow={overflow}
			variant="outlined"
			{...paperProps}
			sx={{
				padding: padding ?? "10px 7px 10px 11px",
				maxHeight: maxHeight ?? "100%",
				height: height ?? "auto",
				width,
				display: visible ? "block" : "none",
				...sx,
			}}
		>
			{(header || onClose) && (
				<Flex
					justifyContent="space-between"
					alignItems="center"
					width="100%"
					as="header"
					style={{ height: `${headerH}px` }}
				>
					{header && <Typography variant="h6">{header}</Typography>}
					{onClose && (
						<IconButton onClick={handler}>
							<CloseIcon />
						</IconButton>
					)}
				</Flex>
			)}
			{!!(header || onClose) && <Spacer space={6} />}
			<Wrapper
				nonClickable={!!nonClickable}
				style={{
					height: header
						? overflow
							? `calc(100% - ${headerH + 45}px)`
							: "inherit"
						: "inherit",
					width: "inherit",
				}}
			>
				{children}
			</Wrapper>
		</MUIPaperStyled>
	);
};

export const Card = (props: CardProps) => {
	if (props.zoom !== undefined && props.uuid) {
		return <CardWithZoom {...props} zoom={props.zoom} uuid={props.uuid} />;
	}
	return <CardWithoutZoom {...props} />;
};

const MUIPaperStyled = styled(Paper)<{ overflow: string }>`
	pointer-events: all;
	position: relative;
	overflow: hidden;
	& > div {
		overflow: ${({ overflow }) => overflow && "auto"};
	}
`;

const LoadingOverlay = styled("div")`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(255, 255, 255, 0.8);
	backdrop-filter: blur(2px);
	z-index: 1000;
	transition: all 0.3s ease-in-out;
	animation: fadeIn 0.3s ease-in-out;

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
`;
