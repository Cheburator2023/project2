import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import { IconButton, Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	useServerNoticesStore,
	type ServerNotice,
	type ServerNoticeKind,
} from "@react-client/common/serverStatus/serverNoticesStore";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

function formatNoticeTime(iso: string): string {
	try {
		return format(parseISO(iso), "d MMM yyyy, HH:mm:ss", { locale: ru });
	} catch {
		return iso;
	}
}

function noticeColor(kind: ServerNoticeKind): string {
	if (kind === "down" || kind === "error") return "error";
	if (kind === "warning") return "warning.main";
	if (kind === "up" || kind === "success") return "success.main";
	return "info.main";
}

function NoticeRow({ notice }: { notice: ServerNotice }) {
	return (
		<Card padding="12px" variant="outlined">
			<Flex flexDirection="column" gap={4}>
				<Typography
					variant="body2"
					fontWeight={600}
					color={noticeColor(notice.kind)}
				>
					{notice.title}
				</Typography>
				{notice.detail ? (
					<Typography variant="caption" color="text.secondary">
						{notice.detail}
					</Typography>
				) : null}
				<Typography variant="caption" color="text.secondary">
					{formatNoticeTime(notice.createdAt)}
				</Typography>
			</Flex>
		</Card>
	);
}

export function HeaderServerNotices() {
	const notices = useServerNoticesStore((s) => s.notices);
	const serverDown = useServerNoticesStore((s) => s.serverDown);
	const drawerOpen = useServerNoticesStore((s) => s.drawerOpen);
	const setDrawerOpen = useServerNoticesStore((s) => s.setDrawerOpen);
	const clearNotices = useServerNoticesStore((s) => s.clearNotices);
	const unreadCount = notices.reduce(
		(count, notice) => count + (notice.read ? 0 : 1),
		0,
	);
	const showDot = unreadCount === 0 && serverDown;
	const title = serverDown
		? "Сервер недоступен — открыть уведомления"
		: "Уведомления";

	return (
		<>
			<div title={title}>
				<IconButton
					onClick={() => setDrawerOpen(true)}
					color={serverDown ? "error" : "default"}
					aria-label={title}
					aria-haspopup="dialog"
					aria-expanded={drawerOpen}
				>
					<Badge
						color="error"
						badgeContent={unreadCount}
						variant={showDot ? "dot" : "standard"}
						invisible={unreadCount === 0 && !serverDown}
						overlap="circular"
					>
						<NotificationsNoneRoundedIcon />
					</Badge>
				</IconButton>
			</div>
			<Drawer
				anchor="right"
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				slotProps={{
					paper: {
						sx: {
							width: 380,
							maxWidth: "100vw",
						},
					},
				}}
			>
				<Card padding="0" height="100%" overflow="hidden">
					<Flex flexDirection="column" height="100%" minHeight="0">
						<Flex
							pad="8px 8px 8px 16px"
							alignItems="center"
							justifyContent="space-between"
							gap={8}
						>
							<Typography variant="subtitle1" fontWeight={700}>
								Уведомления
							</Typography>
							<Flex alignItems="center" gap={4}>
								{notices.length > 0 ? (
									<Button
										size="small"
										color="inherit"
										onClick={clearNotices}
										title="Очистить список"
									>
										Очистить
									</Button>
								) : null}
								<IconButton
									size="small"
									onClick={() => setDrawerOpen(false)}
									title="Закрыть"
									aria-label="Закрыть уведомления"
								>
									<CloseRoundedIcon />
								</IconButton>
							</Flex>
						</Flex>
						<Divider />
						{serverDown ? (
							<>
								<Flex pad="12px 16px 0">
									<Typography variant="body2" color="error">
										Сейчас нет связи с API. Это не ошибка отдельного
										эндпоинта — процесс сервера недоступен.
									</Typography>
								</Flex>
								<Spacer space={8} />
							</>
						) : null}
						<Flex flexDirection="column" flexGrow={1} minHeight="0">
							<Card padding="12px 16px" height="100%" overflow="auto">
								{notices.length === 0 ? (
									<Typography variant="body2" color="text.secondary">
										Пока нет уведомлений.
									</Typography>
								) : (
									<Flex flexDirection="column" gap={8}>
										{notices.map((notice) => (
											<NoticeRow key={notice.id} notice={notice} />
										))}
									</Flex>
								)}
							</Card>
						</Flex>
					</Flex>
				</Card>
			</Drawer>
		</>
	);
}
