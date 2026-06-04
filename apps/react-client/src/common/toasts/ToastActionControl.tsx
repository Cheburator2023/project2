import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridCloseIcon } from "@mui/x-data-grid";
import { useEffect, useRef, useState } from "react";
import type { ToastAction } from "./types";
import { formatSx } from "./utilts";

type ToastActionControlProps = {
	action: ToastAction;
	deleteToast: () => void;
	actionButtonSx?: ToastAction["buttonSx"];
	/** Пауза обратного отсчёта (hover над стеком тостов). */
	autoClosePaused?: boolean;
};

function useCountdownSeconds(
	durationMs: number,
	paused: boolean,
): number {
	const [remainingSec, setRemainingSec] = useState(() =>
		Math.ceil(durationMs / 1000),
	);
	const remainingMsRef = useRef(durationMs);
	const startedAtRef = useRef(Date.now());

	useEffect(() => {
		remainingMsRef.current = durationMs;
		startedAtRef.current = Date.now();
		setRemainingSec(Math.ceil(durationMs / 1000));
	}, [durationMs]);

	useEffect(() => {
		if (durationMs <= 0) return;

		if (paused) {
			const elapsed = Date.now() - startedAtRef.current;
			remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
			setRemainingSec(Math.ceil(remainingMsRef.current / 1000));
			return;
		}

		startedAtRef.current = Date.now();
		const tick = () => {
			const elapsed = Date.now() - startedAtRef.current;
			const leftMs = Math.max(0, remainingMsRef.current - elapsed);
			setRemainingSec(Math.ceil(leftMs / 1000));
		};

		tick();
		const id = window.setInterval(tick, 250);
		return () => window.clearInterval(id);
	}, [durationMs, paused]);

	return remainingSec;
}

export function ToastActionControl({
	action,
	deleteToast,
	actionButtonSx,
	autoClosePaused = false,
}: ToastActionControlProps) {
	const remainingSec = useCountdownSeconds(
		action.countdownDurationMs ?? 0,
		autoClosePaused,
	);
	const hasLabel =
		action.label !== undefined &&
		action.label !== null &&
		action.label !== "";
	const showCountdown =
		action.countdownDurationMs != null && action.countdownDurationMs > 0;

	useEffect(() => {
		if (showCountdown && remainingSec === 0 && !autoClosePaused) {
			deleteToast();
		}
	}, [showCountdown, remainingSec, autoClosePaused, deleteToast]);

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		action.onClick(event);
		if (event.defaultPrevented) return;
		deleteToast();
	};

	if (showCountdown && hasLabel) {
		return (
			<Stack
				direction="row"
				alignItems="center"
				spacing={1}
				sx={{ flexShrink: 0 }}
			>
				<Button
					size="small"
					variant="outlined"
					color="inherit"
					sx={[
						{ whiteSpace: "nowrap" },
						...formatSx(actionButtonSx),
						...formatSx(action.buttonSx),
					]}
					onClick={handleClick}
					title={action.title}
				>
					{action.label}
				</Button>
				<Typography
					variant="caption"
					color="inherit"
					sx={{ opacity: 0.85, minWidth: 28, textAlign: "right" }}
				>
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
				sx={[...formatSx(actionButtonSx), ...formatSx(action.buttonSx)]}
				onClick={handleClick}
				title={action.title}
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
