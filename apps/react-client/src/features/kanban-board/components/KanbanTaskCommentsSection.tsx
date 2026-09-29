import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
	useCreateKanbanBoardTaskComment,
	useDeleteKanbanBoardTaskComment,
	useKanbanBoardAssignees,
	useKanbanBoardTaskComments,
} from "@react-client/common/api/queries/kanban-board";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	getKanbanCommentMentionQueryAtCursor,
	insertKanbanCommentMention,
	replaceKanbanCommentMentionQuery,
	splitKanbanCommentBodyWithMentions,
} from "@react-client/features/kanban-board/kanbanCommentMentions";
import {
	kanbanBoardCommentLengthError,
	KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH,
	kanbanBoardTextLengthHint,
} from "@smart-anketa/api-contract";
import { getTrackerCurrentUserAssigneeName } from "@react-client/features/tracker/utils/trackerCurrentUserAssignee.storage";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";

async function copyTextToClipboard(text: string): Promise<boolean> {
	const value = text.trim();
	if (!value) return false;
	try {
		await navigator.clipboard.writeText(value);
		return true;
	} catch {
		return false;
	}
}

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

function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const formatCommentTime = (iso: string): string => {
	try {
		const date = parseISO(iso);
		return formatDistanceToNow(date, { addSuffix: true, locale: ru });
	} catch {
		return iso;
	}
};

const formatCommentTooltip = (iso: string): string => {
	try {
		return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: ru });
	} catch {
		return iso;
	}
};

export function KanbanTaskCommentsSection({ taskId, disabled }: Props) {
	const commentsQuery = useKanbanBoardTaskComments(taskId);
	const assigneesQuery = useKanbanBoardAssignees();
	const createComment = useCreateKanbanBoardTaskComment();
	const deleteComment = useDeleteKanbanBoardTaskComment();
	const draftInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
		null,
	);

	const [authorName, setAuthorName] = useState("");
	const [draft, setDraft] = useState("");
	const [cursor, setCursor] = useState(0);
	const [mentionIndex, setMentionIndex] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const defaultAuthorName = getTrackerCurrentUserAssigneeName();

	const authorOptions = useMemo<AuthorOption[]>(
		() =>
			(assigneesQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.roleTitle ? `${item.name} — ${item.roleTitle}` : item.name,
			})),
		[assigneesQuery.data],
	);

	const assigneeNames = useMemo(
		() => authorOptions.map((option) => option.value),
		[authorOptions],
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

	const mentionQuery = useMemo(
		() => getKanbanCommentMentionQueryAtCursor(draft, cursor),
		[cursor, draft],
	);

	const mentionSuggestions = useMemo(() => {
		if (!mentionQuery) return [];
		const q = mentionQuery.query.trim().toLowerCase();
		return authorOptions
			.filter((option) => option.value !== authorName)
			.filter((option) =>
				q ? option.value.toLowerCase().includes(q) : true,
			)
			.slice(0, 8);
	}, [authorName, authorOptions, mentionQuery]);

	useEffect(() => {
		setMentionIndex(0);
	}, [mentionQuery?.query, mentionSuggestions.length]);

	useEffect(() => {
		if (!defaultAuthorName || authorName) return;
		if (authorOptions.some((option) => option.value === defaultAuthorName)) {
			setAuthorName(defaultAuthorName);
		}
	}, [authorName, authorOptions, defaultAuthorName]);

	const applyDraft = (next: { body: string; cursor: number }) => {
		setDraft(next.body);
		setCursor(next.cursor);
		requestAnimationFrame(() => {
			const input = draftInputRef.current;
			if (!input) return;
			input.focus();
			input.setSelectionRange(next.cursor, next.cursor);
		});
	};

	const mentionPerson = (name: string) => {
		if (mentionQuery) {
			applyDraft(
				replaceKanbanCommentMentionQuery(draft, mentionQuery, name),
			);
			return;
		}
		applyDraft(insertKanbanCommentMention(draft, name, cursor));
	};

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
		const lengthError = kanbanBoardCommentLengthError(body);
		if (lengthError) {
			setError(lengthError);
			return;
		}
		try {
			await createComment.mutateAsync({
				taskId,
				data: { body, authorName: authorName.trim() },
			});
			setDraft("");
			setCursor(0);
		} catch {
			setError("Не удалось отправить комментарий");
		}
	};

	const handleDraftKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			void handleSubmit();
			return;
		}
		if (!mentionSuggestions.length || !mentionQuery) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setMentionIndex((index) => (index + 1) % mentionSuggestions.length);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setMentionIndex(
				(index) =>
					(index - 1 + mentionSuggestions.length) % mentionSuggestions.length,
			);
			return;
		}
		if (event.key === "Enter" || event.key === "Tab") {
			const option = mentionSuggestions[mentionIndex];
			if (!option) return;
			event.preventDefault();
			mentionPerson(option.value);
		}
		if (event.key === "Escape") {
			event.preventDefault();
			setCursor(draft.length);
		}
	};

	const isBusy = disabled || createComment.isPending || deleteComment.isPending;
	const comments = commentsQuery.data ?? [];
	const draftHint = kanbanBoardTextLengthHint(
		draft.length,
		KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH,
	);

	return (
		<Flex flexDirection="column" gap={12}>
			{commentsQuery.isLoading ? (
				<Flex justifyContent="center" padding="16px 0">
					<CircularProgress size={24} />
				</Flex>
			) : comments.length ? (
				<Flex flexDirection="column" gap={14}>
					{comments.map((comment) => {
						const color = getAuthorColor(comment.authorName);
						const parts = splitKanbanCommentBodyWithMentions(
							comment.body,
							assigneeNames,
						);
						return (
							<Flex key={comment.id} gap={10} alignItems="flex-start">
								<Avatar
									sx={{
										width: 32,
										height: 32,
										fontSize: "0.75rem",
										fontWeight: 700,
										bgcolor: alpha(color, 0.18),
										color,
										flexShrink: 0,
									}}
								>
									{initialsFromName(comment.authorName)}
								</Avatar>
								<Flex flexDirection="column" gap={4} flexGrow={1} minWidth="0">
									<Flex
										alignItems="center"
										justifyContent="space-between"
										gap={8}
									>
										<Flex alignItems="baseline" gap={8} wrap="wrap" minWidth="0">
											<Typography
												component="button"
												type="button"
												variant="body2"
												fontWeight={700}
												noWrap
												disabled={isBusy}
												onClick={() => mentionPerson(comment.authorName)}
												title={`Упомянуть ${comment.authorName}`}
												sx={{
													border: 0,
													background: "none",
													padding: 0,
													cursor: isBusy ? "default" : "pointer",
													color: "inherit",
													font: "inherit",
													fontWeight: 700,
													"&:hover": { textDecoration: "underline" },
												}}
											>
												{comment.authorName}
											</Typography>
											<Typography
												variant="caption"
												color="text.secondary"
												title={formatCommentTooltip(comment.createdAt)}
											>
												{formatCommentTime(comment.createdAt)}
											</Typography>
										</Flex>
										<Flex alignItems="center" gap={2} flexShrink={0}>
											<IconButton
												size="small"
												disabled={!comment.body.trim()}
												onClick={() => {
													void copyTextToClipboard(comment.body);
												}}
												aria-label="Копировать комментарий"
												title="Копировать текст"
											>
												<ContentCopyOutlinedIcon fontSize="small" />
											</IconButton>
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
									</Flex>
									<Typography
										variant="body2"
										sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
									>
										{parts.map((part, index) =>
											part.mention ? (
												<Typography
													key={`${comment.id}-m-${index}`}
													component="span"
													variant="body2"
													fontWeight={700}
													sx={{
														color: "primary.main",
														bgcolor: (theme) =>
															alpha(theme.palette.primary.main, 0.1),
														borderRadius: 0.5,
														px: 0.25,
													}}
												>
													{part.text}
												</Typography>
											) : (
												<span key={`${comment.id}-t-${index}`}>{part.text}</span>
											),
										)}
									</Typography>
								</Flex>
							</Flex>
						);
					})}
				</Flex>
			) : (
				<Typography variant="body2" color="text.secondary">
					Пока нет комментариев
				</Typography>
			)}

			<Spacer space={4} />

			<Flex flexDirection="column" gap={10} position="relative">
				{!defaultAuthorName ? (
					<FuzzyAutocomplete<AuthorOption>
						label="Кто пишет"
						options={authorOptions}
						value={selectedAuthor}
						onChange={(option) => setAuthorName(option?.value ?? "")}
						getOptionLabel={(option) => option.label}
						getOptionValue={(option) => option.value}
						disabled={isBusy || assigneesQuery.isLoading}
						fullWidth
						size="small"
					/>
				) : null}
				<TextField
					value={draft}
					onChange={(event) => {
						setDraft(event.target.value);
						setCursor(event.target.selectionStart ?? event.target.value.length);
					}}
					onSelect={(event) => {
						const target = event.target as HTMLTextAreaElement;
						setCursor(target.selectionStart ?? 0);
					}}
					onClick={(event) => {
						const target = event.target as HTMLTextAreaElement;
						setCursor(target.selectionStart ?? 0);
					}}
					disabled={isBusy}
					fullWidth
					multiline
					minRows={3}
					maxRows={8}
					placeholder="Оставить комментарий… Используйте @ чтобы упомянуть"
					error={draftHint.over}
					helperText={draftHint.text}
					title={`Комментарий: до ${KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH} символов. @ — упоминание`}
					inputRef={draftInputRef}
					inputProps={{
						maxLength: KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH,
					}}
					FormHelperTextProps={{
						sx: draftHint.near ? { color: "warning.main" } : undefined,
					}}
					onKeyDown={handleDraftKeyDown}
				/>
				{mentionSuggestions.length && mentionQuery ? (
					<Paper
						elevation={4}
						sx={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: "100%",
							mb: 0.5,
							maxHeight: 220,
							overflow: "auto",
							zIndex: 2,
						}}
						data-test-id="kanban-comment-mention-menu"
					>
						{mentionSuggestions.map((option, index) => (
							<MenuItem
								key={option.value}
								selected={index === mentionIndex}
								onMouseDown={(event) => {
									event.preventDefault();
									mentionPerson(option.value);
								}}
							>
								{option.label}
							</MenuItem>
						))}
					</Paper>
				) : null}
				<Flex justifyContent="flex-end" alignItems="center" gap={8}>
					<Typography variant="caption" color="text.secondary">
						@ упоминание · Ctrl+Enter
					</Typography>
					<Button
						variant="contained"
						size="small"
						startIcon={<SendIcon />}
						disabled={isBusy || !draft.trim() || draftHint.over}
						onClick={() => void handleSubmit()}
					>
						Комментарий
					</Button>
				</Flex>
				{error ? <Alert severity="error">{error}</Alert> : null}
				{!defaultAuthorName ? (
					<Alert severity="info">
						Укажите себя в настройках трекера — тогда исполнитель будет
						подставляться автоматически.
					</Alert>
				) : null}
			</Flex>
		</Flex>
	);
}
