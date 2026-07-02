import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { usePatchV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { WORK_ARCH_COMPONENT_TYPES, DEFAULT_WORK_ARCH_COMPONENT_TYPE } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorkPatchErrors";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import {
	assignmentStatusLabel,
	DEFAULT_WORK_STREAMS,
	formulaBadgeLabel,
	triggerStatusLabel,
} from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type V2TypicalWorkHeaderState = {
	title: string;
	archComponentType: string;
	isEditing: boolean;
	savePending: boolean;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSave: () => void;
};

type V2TypicalWorkDetailProps = {
	work: V2TypicalWorkListItemDto;
	layout?: "workspace";
	onHeaderChange?: (state: V2TypicalWorkHeaderState | null) => void;
};

export function V2TypicalWorkDetail({
	work,
	layout = "workspace",
	onHeaderChange,
}: V2TypicalWorkDetailProps) {
	const patch = usePatchV2TypicalWork();
	const patchRef = useRef(patch);
	patchRef.current = patch;
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState(work.name);
	const [archComponentType, setArchComponentType] = useState(
		work.archComponentType || DEFAULT_WORK_ARCH_COMPONENT_TYPE,
	);

	const patchStream = useMemo(
		() => work.streams[0] ?? DEFAULT_WORK_STREAMS[0],
		[work.streams],
	);

	useEffect(() => {
		setName(work.name);
		setArchComponentType(
			work.archComponentType || DEFAULT_WORK_ARCH_COMPONENT_TYPE,
		);
		setIsEditing(false);
	}, [work.id, work.name, work.archComponentType]);

	const handleSave = useCallback(async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error("Укажите название работы");
			return;
		}
		try {
			await patchRef.current.mutateAsync({
				workId: work.id,
				dto: {
					streamExecutor: patchStream,
					name: trimmed,
					archComponentType,
				},
			});
			setIsEditing(false);
			toast.success("Работа сохранена");
		} catch (error) {
			toast.error("Не удалось сохранить работу", {
				description: apiErrorMessage(error),
			});
		}
	}, [archComponentType, name, patchStream, work.id]);

	const handleSaveRef = useRef(handleSave);
	handleSaveRef.current = handleSave;

	useEffect(() => {
		onHeaderChange?.({
			title: work.name,
			archComponentType: work.archComponentType,
			isEditing,
			savePending: patch.isPending,
			onStartEdit: () => setIsEditing(true),
			onCancelEdit: () => {
				setName(work.name);
				setArchComponentType(
			work.archComponentType || DEFAULT_WORK_ARCH_COMPONENT_TYPE,
		);
				setIsEditing(false);
			},
			onSave: () => void handleSaveRef.current(),
		});
	}, [
		isEditing,
		onHeaderChange,
		patch.isPending,
		work.archComponentType,
		work.id,
		work.name,
	]);

	useEffect(() => {
		return () => onHeaderChange?.(null);
	}, [onHeaderChange]);

	const normsByStream = work.normsByStream ?? {};

	return (
		<Card
			height="100%"
			width="100%"
			padding={layout === "workspace" ? "16px" : "12px"}
			sx={{ overflow: "auto" }}
		>
			<Flex flexDirection="column" gap={16}>
				<Box>
					<Typography variant="overline" color="text.secondary">
						Карточка работы
					</Typography>
					{isEditing ? (
						<Flex flexDirection="column" gap={12} sx={{ mt: 1.5, maxWidth: 520 }}>
							<TextField
								label="Название"
								value={name}
								onChange={(e) => setName(e.target.value)}
								size="small"
								fullWidth
							/>
							<FormControl size="small" fullWidth>
								<SelectWithPlaceholder
									placeholder="Тип арх. компонента"
									value={archComponentType}
									onChange={(e) => setArchComponentType(String(e.target.value))}
								>
									{WORK_ARCH_COMPONENT_TYPES.map((type) => (
										<MenuItem key={type} value={type}>
											{type}
										</MenuItem>
									))}
								</SelectWithPlaceholder>
							</FormControl>
						</Flex>
					) : (
						<>
							<Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
								{work.name}
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
								{resolveEffectiveWorkArchComponentType(work.archComponentType)}
							</Typography>
						</>
					)}
				</Box>

				<Divider />

				<Box>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Статус
					</Typography>
					<Flex gap={1} wrap="wrap">
						<Chip
							size="small"
							label={triggerStatusLabel(work.triggerStatus)}
							variant="outlined"
						/>
						{work.formulaBadge ? (
							<Chip
								size="small"
								label={formulaBadgeLabel(work.formulaBadge)}
								variant="outlined"
								color="info"
							/>
						) : null}
						<Chip
							size="small"
							label={assignmentStatusLabel(
								work.assignmentStatus,
								work.usedOnSchemasCount ?? 0,
							)}
							variant="outlined"
						/>
					</Flex>
				</Box>

				<Box>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Назначения по стримам
					</Typography>
					{work.streams.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Работа ещё не назначена ни на один стрим. Назначение выполняется в
							редакторе логики шаблона.
						</Typography>
					) : (
						<Flex flexDirection="column" gap={1}>
							{work.streams.map((stream) => (
								<Flex
									key={stream}
									alignItems="center"
									justifyContent="space-between"
									gap={8}
									sx={{
										px: 1.5,
										py: 1,
										borderRadius: "8px",
										border: "1px solid",
										borderColor: "divider",
									}}
								>
									<Typography variant="body2">{stream}</Typography>
									<Typography variant="body2" color="text.secondary">
										норма: {normsByStream[stream] ?? work.currentNorm ?? "—"}
									</Typography>
								</Flex>
							))}
						</Flex>
					)}
				</Box>

				<Alert severity="info">
					Настройка норм, формулы, параметров трудоёмкости и триггеров выполняется в
					редакторе логики шаблона (вкладка «Логика»).
				</Alert>
			</Flex>
		</Card>
	);
}
