import { IconButton, Stack, SxProps, Theme } from "@mui/material";
import { GridCloseIcon } from "@mui/x-data-grid";
import { ReactNode } from "react";
import { ToastT } from ".";
import { ToastAction } from "./types";
import { formatSx } from "./utilts";

interface ActionButtonProps {
	action: ToastAction;
	deleteToast: () => void;
	actionButtonSx?: SxProps<Theme>;
}
const ActionButton = ({
	action,
	deleteToast,
	actionButtonSx,
}: ActionButtonProps) => {
	return (
		<IconButton
			onClick={(event) => {
				action?.onClick(event);
				if (event.defaultPrevented) return;
				deleteToast();
			}}
		>
			<GridCloseIcon color="secondary" />
		</IconButton>
	);
};

const CloseButton = ({
	closeButtonAriaLabel,
	deleteToast,
	closeIcon,
	closeButtonSx,
}: {
	deleteToast: () => void;
	closeIcon: ReactNode;
	closeButtonSx?: SxProps<Theme>;
	closeButtonAriaLabel?: string;
}) => {
	return (
		<IconButton
			size="small"
			color="inherit"
			sx={[{ p: 0.5 }, ...formatSx(closeButtonSx)]}
			aria-label={closeButtonAriaLabel}
			onClick={() => {
				deleteToast();
			}}
		>
			{closeIcon}
		</IconButton>
	);
};

interface AlertActionProps {
	toast: ToastT;
	deleteToast: () => void;
	closeIcon: ReactNode;
	closeButtonAriaLabel?: string;
	defaultCloseButtonSx?: SxProps<Theme>;
	defaultActionButtonSx?: SxProps<Theme>;
}

const AlertAction = ({
	toast,
	deleteToast,
	closeIcon,
	closeButtonAriaLabel,
	defaultCloseButtonSx,
	defaultActionButtonSx,
}: AlertActionProps) => {
	if (toast.action && toast.closeButton) {
		return (
			<Stack direction="row" gap={1}>
				<ActionButton
					action={toast.action}
					deleteToast={deleteToast}
					actionButtonSx={defaultActionButtonSx}
				/>
				<CloseButton
					closeButtonAriaLabel={closeButtonAriaLabel}
					deleteToast={deleteToast}
					closeIcon={closeIcon}
					closeButtonSx={defaultCloseButtonSx}
				/>
			</Stack>
		);
	} else if (toast.action) {
		return (
			<ActionButton
				action={toast.action}
				deleteToast={deleteToast}
				actionButtonSx={defaultActionButtonSx}
			/>
		);
	} else if (toast.closeButton) {
		return (
			<CloseButton
				closeButtonAriaLabel={closeButtonAriaLabel}
				deleteToast={deleteToast}
				closeIcon={closeIcon}
				closeButtonSx={defaultCloseButtonSx}
			/>
		);
	} else {
		return undefined;
	}
};

export default AlertAction;
