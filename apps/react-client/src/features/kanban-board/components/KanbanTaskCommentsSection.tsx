import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
	useCreateKanbanBoardTaskComment,
	useDeleteKanbanBoardTaskComment,
	useKanbanBoardAssignees,
	useKanbanBoardSettings,
	useKanbanBoardTaskComments,
} from "@react-client/common/api/queries/kanban-board";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { KanbanTaskFieldChip } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Fragment, useEffect, useMemo, useState } from "react";

const AUTHOR_CHIP_COLORS = [
	"#2563eb",
	"#0891b2",
	"#7c3aed",
	"#0d9488",
	"#dc2626",
	"#ca8a04",
	"#9333ea",
	"#16a34a",
	"#ea580c",
	"#4f46e5",
] as const;

type AuthorOption = {
	value: string;
	label: string;
};

type Props = {
	taskId: string;
	disabled?: boolean;
};

const formatCommentTime = (iso: string): string => {
	try {
		return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: ru });
	} catch {
		return iso;
	}
};

export function KanbanTaskCommentsSection({ taskId, disabled }: Props) {
	const commentsQuery = useKanbanBoardTaskComments(taskId);
	const assigneesQuery = useKanbanBoardAssignees();
	const settingsQuery = useKanbanBoardSettings();
	const createComment = useCreateKanbanBoardTaskComment();
	const deleteComment = useDeleteKanbanBoardTaskComment();

	const [authorName, setAuthorName] = useState("");
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);

	const authorOptions = useMemo<AuthorOption[]>(
		() =>
			(assigneesQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.roleTitle ? `${item.name} — ${item.roleTitle}` : item.name,
			})),
		[assigneesQuery.data],
	);

	const selectedAuthor = useMemo(
		() => authorOptions.find((option) => option.value === authorName) ?? null,
		[authorName, authorOptions],
	);

	const authorColorByName = useMemo(() => {
		const map = new Map<string, string>();
		(assigneesQuery.data ?? [])
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, "ru"))
			.forEach((assignee, index) => {
				map.set(
					assignee.name,
					AUTHOR_CHIP_COLORS[index % AUTHOR_CHIP_COLORS.length],
				);
			});
		return map;
	}, [assigneesQuery.data]);

	const getAuthorColor = (name: string): string =>
		authorColorByName.get(name) ?? "#64748b";

	useEffect(() => {
		const defaultName = settingsQuery.data?.defaultCurrentUserAssigneeName;
		if (!defaultName || authorName) return;
		if (authorOptions.some((option) => option.value === defaultName)) {
			setAuthorName(defaultName);
		}
	}, [
		authorName,
		authorOptions,
		settingsQuery.data?.defaultCurrentUserAssigneeName,
	]);

	const handleSubmit = async () => {
		setError(null);
		const body = draft.trim();
		if (!authorName.trim()) {
			setError("Выберите исполнителя");
			return;
		}
		if (!body) {
			setError("Введите текст комментария");
			return;
		}
		try {
			await createComment.mutateAsync({
				taskId,
				data: { body, authorName: authorName.trim() },
			});
			setDraft("");
		} catch {
			setError("Не удалось отправить комментарий");
		}
	};

	const isBusy = disabled || createComment.isPending || deleteComment.isPending;
	const comments = commentsQuery.data ?? [];

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Комментарии
			</Typography>

			{commentsQuery.isLoading ? (
				<Flex justifyContent="center" padding="16px 0">
					<CircularProgress size={24} />
				</Flex>
			) : comments.length ? (
				<Box
					sx={{
						maxHeight: 320,
						overflowY: "auto",
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 1,
						px: 1.5,
						py: 1.25,
					}}
				>
					{comments.map((comment, index) => (
						<Fragment key={comment.id}>
							{index > 0 ? <Spacer space={10} /> : null}
							<Box>
								<Flex
									alignItems="center"
									justifyContent="space-between"
									gap={1}
								>
									<Flex alignItems="center" gap={1} wrap="wrap">
										<KanbanTaskFieldChip
											label={comment.authorName}
											color={getAuthorColor(comment.authorName)}
										/>
										<Typography variant="caption" color="text.secondary">
											{formatCommentTime(comment.createdAt)}
										</Typography>
									</Flex>
									<IconButton
										size="small"
										disabled={isBusy}
										onClick={() =>
											void deleteComment.mutateAsync({
												taskId,
												commentId: comment.id,
											})
										}
										aria-label="Удалить комментарий"
										title="Удалить"
									>
										<DeleteOutlineIcon fontSize="small" />
									</IconButton>
								</Flex>
								<Spacer space={6} />
								<Typography
									variant="body2"
									sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
								>
									{comment.body}
								</Typography>
							</Box>
						</Fragment>
					))}
				</Box>
			) : (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Пока нет комментариев
				</Typography>
			)}

			<Spacer space={12} />

			<Flex flexDirection="column" gap={1.5}>
				<FuzzyAutocomplete<AuthorOption>
					label="Кто пишет"
					options={authorOptions}
					value={selectedAuthor}
					onChange={(option) => setAuthorName(option?.value ?? "")}
					getOptionLabel={(option) => option.label}
					getOptionValue={(option) => option.value}
					disabled={isBusy || assigneesQuery.isLoading}
					fullWidth
				/>
				<TextField
					label="Новый комментарий"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					disabled={isBusy}
					fullWidth
					multiline
					minRows={2}
					maxRows={8}
					placeholder="Сообщение по задаче…"
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							void handleSubmit();
						}
					}}
				/>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					wrap="wrap"
					gap={1}
				>
					<Typography variant="caption" color="text.secondary">
						Ctrl+Enter — отправить
					</Typography>
					<Button
						variant="contained"
						size="small"
						startIcon={<SendIcon />}
						disabled={isBusy}
						onClick={() => void handleSubmit()}
					>
						Отправить
					</Button>
				</Flex>
				{error ? <Alert severity="error">{error}</Alert> : null}
				{!settingsQuery.data?.defaultCurrentUserAssigneeName ? (
					<Alert severity="info">
						Укажите себя в настройках трекера — тогда исполнитель будет
						подставляться автоматически.
					</Alert>
				) : null}
			</Flex>
			<Spacer space={4} />
		</Box>
	);
}
