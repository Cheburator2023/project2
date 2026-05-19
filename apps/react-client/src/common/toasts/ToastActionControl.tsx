import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridCloseIcon } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import type { ToastAction } from "./types";
import { formatSx } from "./utilts";

type ToastActionControlProps = {
	action: ToastAction;
	deleteToast: () => void;
	actionButtonSx?: ToastAction["buttonSx"];
};

function useCountdownSeconds(durationMs: number): number {
	const [remainingSec, setRemainingSec] = useState(() =>
		Math.ceil(durationMs / 1000),
	);

	useEffect(() => {
		const startedAt = Date.now();
		const tick = () => {
			const leftMs = Math.max(0, durationMs - (Date.now() - startedAt));
			setRemainingSec(Math.ceil(leftMs / 1000));
		};

		tick();
		const id = window.setInterval(tick, 250);
		return () => window.clearInterval(id);
	}, [durationMs]);

	return remainingSec;
}

export function ToastActionControl({
	action,
	deleteToast,
	actionButtonSx,
}: ToastActionControlProps) {
	const remainingSec = useCountdownSeconds(
		action.countdownDurationMs ?? 0,
	);
	const hasLabel =
		action.label !== undefined &&
		action.label !== null &&
		action.label !== "";
	const showCountdown =
		action.countdownDurationMs != null && action.countdownDurationMs > 0;

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		action.onClick(event);
		if (event.defaultPrevented) return;
		deleteToast();
	};

	if (showCountdown && hasLabel) {
		return (
			<Stack alignItems="flex-end" spacing={0.25} sx={{ minWidth: 88 }}>
				<Button
					size="small"
					variant="outlined"
					color="inherit"
					sx={[{ whiteSpace: "nowrap" }, ...formatSx(action.buttonSx)]}
					onClick={handleClick}
				>
					{action.label}
				</Button>
				<Typography variant="caption" color="inherit" sx={{ opacity: 0.85 }}>
					{remainingSec} с
				</Typography>
			</Stack>
		);
	}

	if (hasLabel) {
		return (
			<Button
				size="small"
				variant="outlined"
				color="inherit"
				sx={formatSx(action.buttonSx)}
				onClick={handleClick}
			>
				{action.label}
			</Button>
		);
	}

	return (
		<IconButton onClick={handleClick}>
			<GridCloseIcon color="secondary" />
		</IconButton>
	);
}
