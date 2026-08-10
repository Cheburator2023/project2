import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
	kanbanBoardFetchTaskFileBlob,
	useDeleteKanbanBoardTaskFile,
	useUploadKanbanBoardTaskFile,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	KANBAN_BOARD_TASK_FILE_MAX_BYTES,
	type KanbanBoardTaskFileRef,
} from "@smart-anketa/api-contract";
import prettyBytes from "pretty-bytes";
import {
	useCallback,
	useRef,
	useState,
	type DragEvent,
} from "react";

const OFFICE_ACCEPT =
	".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv";

type Props = {
	taskId: string;
	files: KanbanBoardTaskFileRef[];
	disabled?: boolean;
};

async function downloadFile(
	taskId: string,
	file: KanbanBoardTaskFileRef,
): Promise<void> {
	const blob = await kanbanBoardFetchTaskFileBlob(taskId, file.id);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = file.name;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function KanbanTaskFilesSection({ taskId, files, disabled }: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	const uploadMutation = useUploadKanbanBoardTaskFile();
	const deleteMutation = useDeleteKanbanBoardTaskFile();

	const processFiles = useCallback(
		async (list: FileList | File[]) => {
			const items = Array.from(list).filter((file) => file.size > 0);
			if (!items.length) return;
			setUploadError(null);
			setUploading(true);
			try {
				for (const file of items) {
					if (file.size > KANBAN_BOARD_TASK_FILE_MAX_BYTES) {
						throw new Error(
							`${file.name}: файл больше ${prettyBytes(KANBAN_BOARD_TASK_FILE_MAX_BYTES)}`,
						);
					}
					await uploadMutation.mutateAsync({ taskId, file });
				}
			} catch (error) {
				setUploadError(
					error instanceof Error
						? error.message
						: "Не удалось загрузить файл",
				);
			} finally {
				setUploading(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[taskId, uploadMutation],
	);

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="subtitle2">Документы</Typography>

			<Box
				role="button"
				tabIndex={disabled ? -1 : 0}
				onKeyDown={(event) => {
					if (disabled || uploading) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						fileInputRef.current?.click();
					}
				}}
				onClick={() => {
					if (disabled || uploading) return;
					fileInputRef.current?.click();
				}}
				onDragOver={(event) => {
					event.preventDefault();
					if (!disabled && !uploading) setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={(event: DragEvent) => {
					event.preventDefault();
					setDragOver(false);
					if (disabled || uploading) return;
					void processFiles(event.dataTransfer.files);
				}}
				sx={{
					border: "2px dashed",
					borderColor: dragOver ? "primary.main" : "divider",
					borderRadius: 1,
					p: 2,
					textAlign: "center",
					cursor: disabled || uploading ? "not-allowed" : "pointer",
					bgcolor: dragOver
						? (theme) => alpha(theme.palette.primary.main, 0.06)
						: "action.hover",
					opacity: disabled ? 0.6 : 1,
				}}
			>
				<Flex
					flexDirection="column"
					alignItems="center"
					gap={4}
					justifyContent="center"
				>
					{uploading ? (
						<CircularProgress size={28} />
					) : (
						<AttachFileOutlinedIcon color="action" />
					)}
					<Typography variant="body2" color="text.secondary">
						{uploading
							? "Загрузка…"
							: "Перетащите документы сюда или нажмите для выбора"}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						PDF, Word, Excel, PowerPoint, ODF, RTF, TXT, CSV · до 15 МБ · без
						превью, только скачивание
					</Typography>
				</Flex>
			</Box>

			<input
				ref={fileInputRef}
				type="file"
				accept={OFFICE_ACCEPT}
				multiple
				hidden
				onChange={(event) => {
					if (event.target.files?.length) {
						void processFiles(event.target.files);
					}
				}}
			/>

			{uploadError ? <Alert severity="error">{uploadError}</Alert> : null}

			{files.length ? (
				<Flex flexDirection="column" gap={6}>
					{files.map((file) => (
						<Flex
							key={file.id}
							alignItems="center"
							gap={8}
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
								px: 1,
								py: 0.75,
								bgcolor: "background.paper",
							}}
						>
							<InsertDriveFileOutlinedIcon
								fontSize="small"
								color="action"
								sx={{ flexShrink: 0 }}
							/>
							<Flex flexDirection="column" gap={2} flexGrow={1} minWidth={0}>
								<Typography
									variant="body2"
									noWrap
									title={file.name}
									sx={{ fontWeight: 500 }}
								>
									{file.name}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{prettyBytes(file.byteSize)}
								</Typography>
							</Flex>
							<IconButton
								size="small"
								aria-label="Скачать файл"
								title="Скачать"
								disabled={downloadingId === file.id}
								onClick={() => {
									setDownloadingId(file.id);
									void downloadFile(taskId, file)
										.catch((error) => {
											setUploadError(
												error instanceof Error
													? error.message
													: "Не удалось скачать файл",
											);
										})
										.finally(() => setDownloadingId(null));
								}}
							>
								{downloadingId === file.id ? (
									<CircularProgress size={16} />
								) : (
									<DownloadOutlinedIcon fontSize="small" />
								)}
							</IconButton>
							{!disabled ? (
								<IconButton
									size="small"
									aria-label="Удалить файл"
									title="Удалить"
									disabled={deleteMutation.isPending}
									onClick={() => {
										void deleteMutation.mutateAsync({
											taskId,
											fileId: file.id,
										});
									}}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							) : null}
						</Flex>
					))}
				</Flex>
			) : null}
		</Flex>
	);
}
