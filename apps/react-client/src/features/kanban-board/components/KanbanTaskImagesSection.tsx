import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
	useDeleteKanbanBoardTaskImage,
	useUploadKanbanBoardTaskImage,
	kanbanBoardFetchTaskImageBlob,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { prepareTaskImageUpload } from "@react-client/features/kanban-board/utils/prepareTaskImageUpload";
import type { KanbanBoardTaskImageRef } from "@smart-anketa/api-contract";
import prettyBytes from "pretty-bytes";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type DragEvent,
} from "react";

type Props = {
	taskId: string;
	images: KanbanBoardTaskImageRef[];
	disabled?: boolean;
	compact?: boolean;
	onOpenLightbox?: (imageId: string) => void;
};

function KanbanTaskImageTile({
	taskId,
	image,
	disabled,
	compact,
	onPreview,
	onDelete,
}: {
	taskId: string;
	image: KanbanBoardTaskImageRef;
	disabled?: boolean;
	compact?: boolean;
	onPreview: () => void;
	onDelete: () => void;
}) {
	const [thumbUrl, setThumbUrl] = useState<string | null>(null);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;
		setLoadError(false);
		void kanbanBoardFetchTaskImageBlob(taskId, image.id, "thumb")
			.then((blob) => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setThumbUrl(objectUrl);
			})
			.catch(() => {
				if (!cancelled) setLoadError(true);
			});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [taskId, image.id]);

	const size = compact ? 40 : 96;

	return (
		<Box
			sx={{
				position: "relative",
				width: size,
				height: size,
				flexShrink: 0,
				borderRadius: 1,
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				bgcolor: "action.hover",
				cursor: "pointer",
			}}
			onClick={onPreview}
			title={image.name}
		>
			{thumbUrl ? (
				<Box
					component="img"
					src={thumbUrl}
					alt={image.name}
					sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
				/>
			) : loadError ? (
				<Flex alignItems="center" justifyContent="center" height="100%">
					<ImageOutlinedIcon fontSize="small" color="disabled" />
				</Flex>
			) : (
				<Flex alignItems="center" justifyContent="center" height="100%">
					<CircularProgress size={compact ? 16 : 22} />
				</Flex>
			)}
			{!compact && !disabled ? (
				<IconButton
					size="small"
					aria-label="Удалить изображение"
					title="Удалить"
					onClick={(event) => {
						event.stopPropagation();
						onDelete();
					}}
					sx={{
						position: "absolute",
						top: 2,
						right: 2,
						bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
						"&:hover": {
							bgcolor: (theme) => alpha(theme.palette.background.paper, 1),
						},
					}}
				>
					<DeleteOutlineIcon fontSize="small" />
				</IconButton>
			) : null}
		</Box>
	);
}

function KanbanTaskImageLightbox({
	taskId,
	image,
	open,
	onClose,
}: {
	taskId: string;
	image: KanbanBoardTaskImageRef | null;
	open: boolean;
	onClose: () => void;
}) {
	const [fullUrl, setFullUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !image) {
			setFullUrl(null);
			return;
		}
		let cancelled = false;
		let objectUrl: string | null = null;
		setLoading(true);
		void kanbanBoardFetchTaskImageBlob(taskId, image.id, "full")
			.then((blob) => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setFullUrl(objectUrl);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [open, image, taskId]);

	if (!image) return null;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth={false}
			slotProps={{
				paper: {
					sx: {
						bgcolor: "transparent",
						boxShadow: "none",
						overflow: "visible",
						maxWidth: "min(96vw, 1400px)",
						maxHeight: "96vh",
					},
				},
			}}
		>
			<Flex flexDirection="column" gap={8} alignItems="flex-end">
				<IconButton
					onClick={onClose}
					aria-label="Закрыть"
					title="Закрыть"
					sx={{
						bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
					}}
				>
					<CloseIcon />
				</IconButton>
				<Box
					sx={{
						maxWidth: "min(96vw, 1400px)",
						maxHeight: "calc(96vh - 48px)",
						overflow: "auto",
						borderRadius: 1,
						bgcolor: "background.paper",
					}}
				>
					{loading ? (
						<Flex
							alignItems="center"
							justifyContent="center"
							sx={{ width: 320, height: 240 }}
						>
							<CircularProgress />
						</Flex>
					) : fullUrl ? (
						<Box
							component="img"
							src={fullUrl}
							alt={image.name}
							sx={{
								display: "block",
								maxWidth: "min(96vw, 1400px)",
								maxHeight: "calc(96vh - 48px)",
								width: "auto",
								height: "auto",
							}}
						/>
					) : (
						<Alert severity="error" sx={{ m: 2 }}>
							Не удалось загрузить изображение
						</Alert>
					)}
				</Box>
				<Typography
					variant="caption"
					sx={{
						color: "common.white",
						textShadow: "0 1px 4px rgba(0,0,0,0.6)",
						px: 1,
					}}
				>
					{image.name} · {image.width}×{image.height} ·{" "}
					{prettyBytes(image.fullByteSize)}
				</Typography>
			</Flex>
		</Dialog>
	);
}

export function KanbanTaskImagesSection({
	taskId,
	images,
	disabled,
	compact,
	onOpenLightbox,
}: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [lightboxId, setLightboxId] = useState<string | null>(null);

	const uploadMutation = useUploadKanbanBoardTaskImage();
	const deleteMutation = useDeleteKanbanBoardTaskImage();

	const lightboxImage =
		images.find((item) => item.id === lightboxId) ?? null;

	const processFiles = useCallback(
		async (files: FileList | File[]) => {
			const list = Array.from(files).filter(
				(file) => file.type.startsWith("image/") || file.size > 0,
			);
			if (!list.length) return;

			setUploadError(null);
			setUploading(true);
			try {
				for (const file of list) {
					const prepared = await prepareTaskImageUpload(file);
					await uploadMutation.mutateAsync({
						taskId,
						prepared,
					});
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Не удалось загрузить изображение";
				setUploadError(message);
			} finally {
				setUploading(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[taskId, uploadMutation],
	);

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragOver(false);
		if (disabled || uploading) return;
		void processFiles(event.dataTransfer.files);
	};

	const openLightbox = (imageId: string) => {
		if (onOpenLightbox) {
			onOpenLightbox(imageId);
			return;
		}
		setLightboxId(imageId);
	};

	if (compact) {
		if (!images.length) return null;
		return (
			<>
				<Box
					onClick={(event) => event.stopPropagation()}
					onMouseDown={(event) => event.stopPropagation()}
				>
					<Flex gap={4} wrap="wrap" alignItems="center">
						{images.slice(0, 3).map((image) => (
							<KanbanTaskImageTile
								key={image.id}
								taskId={taskId}
								image={image}
								compact
								onPreview={() => openLightbox(image.id)}
								onDelete={() => undefined}
							/>
						))}
						{images.length > 3 ? (
							<Typography variant="caption" color="text.secondary">
								+{images.length - 3}
							</Typography>
						) : null}
					</Flex>
				</Box>
				<KanbanTaskImageLightbox
					taskId={taskId}
					image={lightboxImage}
					open={Boolean(lightboxId && lightboxImage)}
					onClose={() => setLightboxId(null)}
				/>
			</>
		);
	}

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="subtitle2">Изображения</Typography>

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
				onDrop={handleDrop}
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
						<ImageOutlinedIcon color="action" />
					)}
					<Typography variant="body2" color="text.secondary">
						{uploading
							? "Сжатие и загрузка…"
							: "Перетащите изображения сюда или нажмите для выбора"}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Lossless PNG/WebP, макс. 2 МБ после сжатия
					</Typography>
				</Flex>
			</Box>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={(event) => {
					if (event.target.files?.length) {
						void processFiles(event.target.files);
					}
				}}
			/>

			{uploadError ? <Alert severity="error">{uploadError}</Alert> : null}

			{images.length ? (
				<Flex gap={8} wrap="wrap">
					{images.map((image) => (
						<Flex key={image.id} flexDirection="column" gap={4} alignItems="center">
							<KanbanTaskImageTile
								taskId={taskId}
								image={image}
								disabled={disabled || deleteMutation.isPending}
								onPreview={() => openLightbox(image.id)}
								onDelete={() => {
									void deleteMutation.mutateAsync({ taskId, imageId: image.id });
								}}
							/>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ maxWidth: 96, textAlign: "center", wordBreak: "break-word" }}
							>
								{prettyBytes(image.fullByteSize)}
							</Typography>
						</Flex>
					))}
				</Flex>
			) : null}

			<KanbanTaskImageLightbox
				taskId={taskId}
				image={lightboxImage}
				open={Boolean(lightboxId && lightboxImage)}
				onClose={() => setLightboxId(null)}
			/>
		</Flex>
	);
}
