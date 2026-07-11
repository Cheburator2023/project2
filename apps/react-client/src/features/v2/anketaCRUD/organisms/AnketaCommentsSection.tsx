import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import SortIcon from "@mui/icons-material/Sort";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { V2QuestionnaireCommentDto } from "@smart-anketa/api-contract";
import {
	useCreateV2QuestionnaireComment,
	useDeleteV2QuestionnaireComment,
	useV2QuestionnaireComments,
} from "@react-client/common/api/queries/v2-questionnaires";
import { Card } from "@react-client/common/muiCustom/Card";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { useUserStore } from "@react-client/common/store/userStore";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
	authorInitials,
	buildCommentTree,
	hashAuthorColor,
	sortCommentRoots,
	COMMENT_SORT_LABELS,
	type CommentNode,
	type CommentSort,
} from "../utils/anketaComments.util";

const PARTICIPANT_COLORS = [
	"#7c3aed",
	"#0891b2",
	"#0d9488",
	"#dc2626",
	"#ca8a04",
	"#9333ea",
	"#16a34a",
	"#ea580c",
	"#4f46e5",
	"#be185d",
] as const;

const ANKETA_AUTHOR_COLOR = "#1565c0";

type Props = {
	questionnaireId: string;
	disabled?: boolean;
};

function resolveAuthorColor(comment: V2QuestionnaireCommentDto): string {
	return comment.isAnketaAuthor
		? ANKETA_AUTHOR_COLOR
		: hashAuthorColor(comment.authorName, PARTICIPANT_COLORS);
}

function formatRelativeTime(iso: string): string {
	try {
		return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ru });
	} catch {
		return iso;
	}
}

function resolveCurrentUserName(): string {
	const keycloakUser = useGlobalSettingsStore.getState().user;
	if (keycloakUser) {
		const fullName =
			`${keycloakUser.given_name ?? ""} ${keycloakUser.family_name ?? ""}`.trim();
		return (
			fullName ||
			keycloakUser.preferred_username ||
			keycloakUser.email ||
			"Пользователь"
		);
	}
	return useUserStore.getState().username ?? "Пользователь";
}

function CommentAvatar({ comment }: { comment: V2QuestionnaireCommentDto }) {
	const color = resolveAuthorColor(comment);
	return (
		<Box
			sx={{
				width: 36,
				height: 36,
				borderRadius: "50%",
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				bgcolor: alpha(color, comment.isAnketaAuthor ? 0.18 : 0.14),
				color,
				border: `2px solid ${alpha(color, 0.45)}`,
				fontWeight: 700,
				fontSize: 13,
			}}
		>
			{authorInitials(comment.authorName)}
		</Box>
	);
}

function CommentItem({
	comment,
	depth,
	disabled,
	isBusy,
	onReply,
	onDelete,
}: {
	comment: CommentNode;
	depth: number;
	disabled?: boolean;
	isBusy: boolean;
	onReply: (comment: V2QuestionnaireCommentDto) => void;
	onDelete: (commentId: string) => void;
}) {
	const color = resolveAuthorColor(comment);

	return (
		<Box
			sx={{
				pl: depth > 0 ? 3 : 0,
				position: depth > 0 ? "relative" : undefined,
			}}
		>
			{depth > 0 ? (
				<Box
					sx={{
						position: "absolute",
						left: 18,
						top: 0,
						bottom: 0,
						width: 2,
						bgcolor: "divider",
						borderRadius: 1,
					}}
				/>
			) : null}
			<Flex gap={12} alignItems="flex-start" position="relative">
				<CommentAvatar comment={comment} />
				<Flex flexDirection="column" flexGrow={1} minWidth="0" gap={0.5}>
					<Flex alignItems="center" gap={1} wrap="wrap">
						<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
							{comment.authorName}
						</Typography>
						{comment.isAnketaAuthor ? (
							<Chip
								size="small"
								label="Автор анкеты"
								sx={{
									height: 20,
									fontSize: 11,
									fontWeight: 600,
									bgcolor: alpha(ANKETA_AUTHOR_COLOR, 0.12),
									color: ANKETA_AUTHOR_COLOR,
									border: `1px solid ${alpha(ANKETA_AUTHOR_COLOR, 0.28)}`,
								}}
							/>
						) : (
							<Chip
								size="small"
								label="Участник"
								sx={{
									height: 20,
									fontSize: 11,
									fontWeight: 600,
									bgcolor: alpha(color, 0.1),
									color,
									border: `1px solid ${alpha(color, 0.25)}`,
								}}
							/>
						)}
						<Typography variant="caption" color="text.secondary">
							{formatRelativeTime(comment.createdAt)}
						</Typography>
					</Flex>
					<Typography
						variant="body2"
						sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
					>
						{comment.body}
					</Typography>
					<Flex alignItems="center" gap={0.5}>
						<Button
							size="small"
							variant="text"
							startIcon={<ReplyOutlinedIcon sx={{ fontSize: 16 }} />}
							disabled={disabled || isBusy}
							onClick={() => onReply(comment)}
							sx={{
								minWidth: 0,
								px: 1,
								textTransform: "none",
								color: "text.secondary",
							}}
						>
							Ответить
						</Button>
						<IconButton
							size="small"
							disabled={disabled || isBusy}
							onClick={() => onDelete(comment.id)}
							aria-label="Удалить комментарий"
							title="Удалить"
						>
							<DeleteOutlineIcon fontSize="small" />
						</IconButton>
					</Flex>
				</Flex>
			</Flex>
			{comment.replies.length > 0 ? (
				<Box sx={{ mt: 1.5, position: "relative" }}>
					{comment.replies.map((reply) => (
						<Box key={reply.id} sx={{ mb: 1.5 }}>
							<CommentItem
								comment={reply}
								depth={depth + 1}
								disabled={disabled}
								isBusy={isBusy}
								onReply={onReply}
								onDelete={onDelete}
							/>
						</Box>
					))}
				</Box>
			) : null}
		</Box>
	);
}

export function AnketaCommentsSection({ questionnaireId, disabled }: Props) {
	const commentsQuery = useV2QuestionnaireComments(questionnaireId);
	const createComment = useCreateV2QuestionnaireComment();
	const deleteComment = useDeleteV2QuestionnaireComment();

	const [draft, setDraft] = useState("");
	const [replyTo, setReplyTo] = useState<V2QuestionnaireCommentDto | null>(
		null,
	);
	const [sort, setSort] = useState<CommentSort>("recent");
	const [error, setError] = useState<string | null>(null);

	const sortedRoots = useMemo(() => {
		const roots = buildCommentTree(commentsQuery.data ?? []);
		return sortCommentRoots(roots, sort);
	}, [commentsQuery.data, sort]);

	const isBusy = disabled || createComment.isPending || deleteComment.isPending;
	const commentCount = commentsQuery.data?.length ?? 0;

	const handleSubmit = async () => {
		setError(null);
		const body = draft.trim();
		if (!body) {
			setError("Введите текст комментария");
			return;
		}
		try {
			await createComment.mutateAsync({
				questionnaireId,
				data: {
					body,
					parentCommentId: replyTo?.id ?? null,
				},
			});
			setDraft("");
			setReplyTo(null);
		} catch {
			setError("Не удалось отправить комментарий");
		}
	};

	const handleDelete = async (commentId: string) => {
		try {
			await deleteComment.mutateAsync({ questionnaireId, commentId });
			if (replyTo?.id === commentId) setReplyTo(null);
		} catch {
			setError("Не удалось удалить комментарий");
		}
	};

	return (
		<Card padding="20px" data-test-id="anketa-comments-section">
			<Box
				sx={{
					border: "1px solid",
					borderColor: "divider",
					borderRadius: 2,
					bgcolor: "grey.50",
					p: 2,
				}}
			>
				<TextField
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					disabled={isBusy}
					fullWidth
					multiline
					minRows={3}
					maxRows={8}
					placeholder="Добавить комментарий…"
					variant="outlined"
					sx={{
						"& .MuiOutlinedInput-root": {
							bgcolor: "background.paper",
						},
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							void handleSubmit();
						}
					}}
				/>
				<Spacer space={10} />
				<Flex
					justifyContent="space-between"
					alignItems="center"
					wrap="wrap"
					gap={1}
				>
					<Typography variant="caption" color="text.secondary">
						{resolveCurrentUserName()} · Ctrl+Enter — отправить
					</Typography>
					<Button
						variant="contained"
						size="small"
						disabled={isBusy}
						onClick={() => void handleSubmit()}
						sx={{ fontWeight: 600, px: 2.5 }}
					>
						Отправить
					</Button>
				</Flex>
				{replyTo ? (
					<>
						<Spacer space={8} />
						<Flex alignItems="center" gap={1} wrap="wrap">
							<Typography variant="caption" color="text.secondary">
								Ответ для {replyTo.authorName}
							</Typography>
							<Button
								size="small"
								variant="text"
								onClick={() => setReplyTo(null)}
								sx={{ minWidth: 0, px: 0.5, textTransform: "none" }}
							>
								Отмена
							</Button>
						</Flex>
					</>
				) : null}
				{error ? (
					<>
						<Spacer space={8} />
						<Alert severity="error">{error}</Alert>
					</>
				) : null}
			</Box>

			<Spacer space={16} />

			<Flex
				alignItems="center"
				justifyContent="space-between"
				gap={12}
				wrap="wrap"
			>
				<Flex alignItems="center" gap={1}>
					<Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
						Комментарии
					</Typography>
					<Chip
						size="small"
						label={commentCount}
						sx={{
							height: 22,
							fontWeight: 700,
							bgcolor: alpha("#ed6c02", 0.12),
							color: "#ed6c02",
							border: `1px solid ${alpha("#ed6c02", 0.25)}`,
						}}
					/>
				</Flex>
				<Flex alignItems="center" gap={10}>
					<SortIcon sx={{ fontSize: 18, color: "text.secondary" }} />
					<SelectWithPlaceholder
						size="small"
						placeholder="Сортировка"
						value={sort}
						renderSelected={(value) => COMMENT_SORT_LABELS[value as CommentSort]}
						onChange={(event) => setSort(event.target.value as CommentSort)}
						sx={{ minWidth: 160 }}
					>
						<MenuItem value="recent">{COMMENT_SORT_LABELS.recent}</MenuItem>
						<MenuItem value="oldest">{COMMENT_SORT_LABELS.oldest}</MenuItem>
					</SelectWithPlaceholder>
				</Flex>
			</Flex>

			<Spacer space={12} />

			{commentsQuery.isLoading ? (
				<Flex justifyContent="center" padding="24px 0">
					<CircularProgress size={28} />
				</Flex>
			) : sortedRoots.length ? (
				<Flex flexDirection="column" gap={16}>
					{sortedRoots.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							depth={0}
							disabled={disabled}
							isBusy={isBusy}
							onReply={setReplyTo}
							onDelete={(commentId) => void handleDelete(commentId)}
						/>
					))}
				</Flex>
			) : (
				<Typography variant="body2" color="text.secondary">
					Пока нет комментариев — будьте первым.
				</Typography>
			)}
		</Card>
	);
}
