import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {
	useDeleteKanbanBoardTaskImage,
	useUploadKanbanBoardTaskImage,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	KanbanTaskImageLightbox,
	KanbanTaskImageTile,
} from "@react-client/features/kanban-board/components/KanbanTaskImagesSection";
import { prepareTaskImageUpload } from "@react-client/features/kanban-board/utils/prepareTaskImageUpload";
import type { KanbanBoardTaskImageRef } from "@smart-anketa/api-contract";
import { useCallback, useRef, useState } from "react";

type Props = {
	taskId?: string;
	subtaskId: string;
	images: KanbanBoardTaskImageRef[];
	disabled?: boolean;
	compact?: boolean;
	allowUpload?: boolean;
	onUploaded?: (image: KanbanBoardTaskImageRef) => void;
	onDeleted?: (imageId: string) => void;
};

export function KanbanSubtaskImages({
	taskId,
	subtaskId,
	images,
	disabled = false,
	compact = false,
	allowUpload = false,
	onUploaded,
	onDeleted,
}: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [lightboxId, setLightboxId] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const uploadMutation = useUploadKanbanBoardTaskImage();
	const deleteMutation = useDeleteKanbanBoardTaskImage();

	const canUpload = Boolean(allowUpload && taskId && !disabled);
	const visibleImages = compact ? images.slice(0, 3) : images;
	const lightboxImage = images.find((item) => item.id === lightboxId) ?? null;

	const processFiles = useCallback(
		async (files: FileList | File[]) => {
			if (!taskId || !canUpload) return;
			const list = Array.from(files).filter(
				(file) => file.type.startsWith("image/") || file.size > 0,
			);
			if (!list.length) return;

			setUploadError(null);
			setUploading(true);
			try {
				for (const file of list) {
					const prepared = await prepareTaskImageUpload(file);
					const image = await uploadMutation.mutateAsync({
						taskId,
						prepared,
						subtaskId,
					});
					onUploaded?.(image);
				}
			} catch (error) {
				setUploadError(
					error instanceof Error
						? error.message
						: "Не удалось загрузить изображение",
				);
			} finally {
				setUploading(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[canUpload, onUploaded, subtaskId, taskId, uploadMutation],
	);

	if (compact && !images.length) return null;
	if (!images.length && !allowUpload) return null;

	return (
		<Flex flexDirection="column" gap={4} minWidth={0}>
			<Flex
				gap={6}
				wrap="wrap"
				alignItems="center"
				onClick={(event) => event.stopPropagation()}
				onMouseDown={(event) => event.stopPropagation()}
			>
				{taskId
					? visibleImages.map((image) => (
							<Flex key={image.id} alignItems="center" gap={2}>
								<KanbanTaskImageTile
									taskId={taskId}
									image={image}
									compact
									showDelete={false}
									onPreview={() => setLightboxId(image.id)}
									onDelete={() => undefined}
								/>
								{allowUpload && !disabled ? (
									<IconButton
										size="small"
										aria-label="Удалить изображение"
										title="Удалить"
										onClick={() => {
											void deleteMutation
												.mutateAsync({ taskId, imageId: image.id })
												.then(() => onDeleted?.(image.id));
										}}
										sx={{ p: 0.25, width: 22, height: 22, flexShrink: 0 }}
									>
										<DeleteOutlineIcon sx={{ fontSize: 14 }} />
									</IconButton>
								) : null}
							</Flex>
						))
					: null}
				{compact && images.length > 3 ? (
					<Typography variant="caption" color="text.secondary">
						+{images.length - 3}
					</Typography>
				) : null}
				{allowUpload ? (
					<>
						<IconButton
							size="small"
							disabled={!canUpload || uploading}
							onClick={() => fileInputRef.current?.click()}
							title={
								taskId
									? "Прикрепить изображение"
									: "Прикрепить изображение можно после сохранения задачи"
							}
							aria-label="Прикрепить изображение к подзадаче"
							sx={{ p: 0.25, width: 22, height: 22, flexShrink: 0 }}
						>
							{uploading ? (
								<CircularProgress size={14} />
							) : (
								<AddPhotoAlternateOutlinedIcon sx={{ fontSize: 16 }} />
							)}
						</IconButton>
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
					</>
				) : null}
			</Flex>
			{uploadError ? (
				<Alert severity="error" sx={{ py: 0 }}>
					{uploadError}
				</Alert>
			) : null}
			{taskId ? (
				<KanbanTaskImageLightbox
					taskId={taskId}
					image={lightboxImage}
					open={Boolean(lightboxId && lightboxImage)}
					onClose={() => setLightboxId(null)}
				/>
			) : null}
		</Flex>
	);
}
