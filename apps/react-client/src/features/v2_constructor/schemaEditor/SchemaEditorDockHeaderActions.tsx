import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureInPictureAltIcon from "@mui/icons-material/PictureInPictureAlt";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { IDockviewHeaderActionsProps } from "dockview-react";

const POPOUT_URL = "/popout.html";

const FLOAT_SIZE = { width: 420, height: 320, right: 48, bottom: 48 } as const;

function HeaderActionButton({
	title,
	ariaLabel,
	onClick,
	children,
}: {
	title: string;
	ariaLabel: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<IconButton
			size="small"
			title={title}
			aria-label={ariaLabel}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onMouseDown={(e) => e.stopPropagation()}
			sx={{ p: 0.35, color: "text.secondary" }}
		>
			{children}
		</IconButton>
	);
}

/** Кнопки maximize, floating и popout — по примерам dockview. */
export function SchemaEditorDockHeaderRightActions(
	props: IDockviewHeaderActionsProps,
) {
	const groupApi = props.group.api;
	const location = groupApi.location;

	const [maximized, setMaximized] = useState(() => groupApi.isMaximized());
	const [floating, setFloating] = useState(
		() => location.type === "floating",
	);
	const [popout, setPopout] = useState(() => location.type === "popout");

	useEffect(() => {
		const d1 = props.containerApi.onDidMaximizedGroupChange(() => {
			setMaximized(groupApi.isMaximized());
		});
		const d2 = groupApi.onDidLocationChange((event) => {
			setFloating(event.location.type === "floating");
			setPopout(event.location.type === "popout");
		});
		return () => {
			d1.dispose();
			d2.dispose();
		};
	}, [props.containerApi, groupApi]);

	const dockBackToGrid = useCallback(() => {
		const group = props.containerApi.addGroup();
		groupApi.moveTo({ group });
	}, [props.containerApi, groupApi]);

	const onMaximizeClick = useCallback(() => {
		if (maximized) {
			groupApi.exitMaximized();
		} else {
			groupApi.maximize();
		}
	}, [groupApi, maximized]);

	const onFloatClick = useCallback(() => {
		if (floating) {
			dockBackToGrid();
			return;
		}
		props.containerApi.addFloatingGroup(props.group, {
			position: FLOAT_SIZE,
		});
	}, [props.containerApi, props.group, floating, dockBackToGrid]);

	const onPopoutClick = useCallback(() => {
		if (popout) {
			dockBackToGrid();
			return;
		}
		void props.containerApi.addPopoutGroup(props.group, {
			popoutUrl: POPOUT_URL,
			position: {
				width: 720,
				height: 480,
				left: Math.max(0, window.screenX + 80),
				top: Math.max(0, window.screenY + 48),
			},
		});
	}, [props.containerApi, props.group, popout, dockBackToGrid]);

	const canMaximize = location.type === "grid";

	return (
		<Stack
			direction="row"
			alignItems="center"
			spacing={0}
			sx={{ height: "100%", px: 0.25 }}
		>
			{canMaximize ? (
				<HeaderActionButton
					title={maximized ? "Восстановить размер" : "Развернуть группу"}
					ariaLabel={maximized ? "Восстановить" : "Развернуть"}
					onClick={onMaximizeClick}
				>
					{maximized ? (
						<CloseFullscreenIcon sx={{ fontSize: 18 }} />
					) : (
						<FullscreenIcon sx={{ fontSize: 18 }} />
					)}
				</HeaderActionButton>
			) : null}
			{!popout ? (
				<HeaderActionButton
					title={
						floating
							? "Вернуть вкладки в док"
							: "Плавающая группа (отдельное окно внутри страницы)"
					}
					ariaLabel={floating ? "В док" : "Плавающее"}
					onClick={onFloatClick}
				>
					{floating ? (
						<ViewCompactIcon sx={{ fontSize: 18 }} />
					) : (
						<PictureInPictureAltIcon sx={{ fontSize: 18 }} />
					)}
				</HeaderActionButton>
			) : null}
			<HeaderActionButton
				title={
					popout
						? "Вернуть из отдельного окна браузера"
						: "Открыть группу в новом окне браузера"
				}
				ariaLabel={popout ? "Из popout" : "Popout"}
				onClick={onPopoutClick}
			>
				<OpenInNewIcon sx={{ fontSize: 18 }} />
			</HeaderActionButton>
		</Stack>
	);
}
