import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { V2TypicalWorkCatalogItemDto } from "@smart-anketa/api-contract";
import {
	useCreateV2TypicalWorkAssignment,
	usePatchV2TypicalWork,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useMemo, useState } from "react";
import { toast } from "@react-client/common/toasts";
import { ARCH_COMPONENT_DOT } from "./typicalWorksUi";
import { scopeLabel, type LogicWorksScope } from "./typicalWorksAreas";
import {
	buildAssignWorkPatch,
	inferBaseNormValue,
	targetStreamsForAssign,
} from "./typicalWorksAssignment";

type AssignWorkFromCatalogDialogProps = {
	open: boolean;
	scope: LogicWorksScope;
	scopeStreams: string[];
	works: V2TypicalWorkCatalogItemDto[];
	templateVersionId: string | null;
	onClose: () => void;
	onAssigned: (workId: string, streamExecutor: string) => void;
	onCreateNew: () => void;
};

export function AssignWorkFromCatalogDialog({
	open,
	scope,
	scopeStreams,
	works,
	templateVersionId,
	onClose,
	onAssigned,
	onCreateNew,
}: AssignWorkFromCatalogDialogProps) {
	const createAssignment = useCreateV2TypicalWorkAssignment();
	const patch = usePatchV2TypicalWork();
	const [query, setQuery] = useState("");
	const [archFilter, setArchFilter] = useState<string>("all");
	const [pending, setPending] = useState(false);

	const archComponents = useMemo(() => {
		const set = new Set(works.map((w) => w.archComponentType));
		return [...set].sort((a, b) => a.localeCompare(b, "ru"));
	}, [works]);

	const items = useMemo(() => {
		const q = query.trim().toLowerCase();
		return works.filter((work) => {
			const notAllAssigned = targetStreamsForAssign(work, scopeStreams).length > 0;
			if (!notAllAssigned) return false;
			if (archFilter !== "all" && work.archComponentType !== archFilter) return false;
			if (q && !work.name.toLowerCase().includes(q)) return false;
			return true;
		});
	}, [archFilter, query, scopeStreams, works]);

	const handleAssign = async (work: V2TypicalWorkCatalogItemDto) => {
		const streams = targetStreamsForAssign(work, scopeStreams);
		if (!streams.length) return;
		setPending(true);
		try {
			const baseNorm = inferBaseNormValue(work);
			for (const streamExecutor of streams) {
				await createAssignment.mutateAsync({
					workId: work.id,
					streamExecutor,
				});
				await patch.mutateAsync({
					workId: work.id,
					dto: {
						...buildAssignWorkPatch(streamExecutor, baseNorm),
						templateVersionId: templateVersionId ?? undefined,
					},
				});
			}
			toast.success(`«${work.name}» назначена на область`);
			onAssigned(work.id, streams[0] ?? work.streams[0] ?? "");
			onClose();
		} catch (err) {
			toast.error("Не удалось назначить работу", {
				description: apiErrorMessage(err),
			});
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ fontWeight: 800 }}>Добавить работы из справочника</DialogTitle>
			<DialogContent sx={{ pt: 0 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Назначить на: <b>{scopeLabel(scope)}</b>
				</Typography>
				<TextField
					size="small"
					fullWidth
					placeholder="Поиск работы…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ mb: 1.5 }}
				/>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
					<Button
						size="small"
						variant={archFilter === "all" ? "contained" : "outlined"}
						onClick={() => setArchFilter("all")}
						sx={{ textTransform: "none" }}
					>
						Все компоненты
					</Button>
					{archComponents.map((arch) => (
						<Button
							key={arch}
							size="small"
							variant={archFilter === arch ? "contained" : "outlined"}
							onClick={() => setArchFilter(arch)}
							sx={{ textTransform: "none" }}
						>
							{arch}
						</Button>
					))}
				</Box>
				<Box sx={{ maxHeight: 360, overflow: "auto" }}>
					{items.length === 0 ? (
						<Typography sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
							Все подходящие работы уже назначены.{" "}
							<Box
								component="button"
								type="button"
								onClick={onCreateNew}
								sx={{
									border: "none",
									bgcolor: "transparent",
									color: "primary.main",
									fontWeight: 600,
									cursor: "pointer",
									fontFamily: "inherit",
								}}
							>
								Создать новую работу
							</Box>
						</Typography>
					) : (
						items.map((work) => {
							const dot = ARCH_COMPONENT_DOT[work.archComponentType] ?? "#94a3b8";
							const assignedCount = work.assignmentCount;
							return (
								<Box
									key={work.id}
									onClick={() => void handleAssign(work)}
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1.5,
										p: 1.25,
										mb: 0.75,
										borderRadius: "10px",
										border: "1px solid #f0f1f5",
										cursor: pending ? "wait" : "pointer",
										"&:hover": { bgcolor: "#f8f9fb" },
									}}
								>
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
											{work.name}
										</Typography>
										<Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
											<Box
												sx={{
													width: 6,
													height: 6,
													borderRadius: "2px",
													bgcolor: dot,
												}}
											/>
											<Typography sx={{ fontSize: 10.5, color: "#5b6577" }}>
												{work.archComponentType}
											</Typography>
											<Typography sx={{ fontSize: 10.5, color: "#aab1c0" }}>
												· {assignedCount ? `уже на ${assignedCount} стр.` : "свободна"}
											</Typography>
										</Box>
									</Box>
									<Box
										sx={{
											px: 1.5,
											py: 0.75,
											borderRadius: "8px",
											bgcolor: "#eef4ff",
											color: "#2f6bd8",
											fontSize: 12,
											fontWeight: 700,
										}}
									>
										Назначить
									</Box>
								</Box>
							);
						})
					)}
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onCreateNew} disabled={pending}>
					+ Создать новую работу
				</Button>
				<Box sx={{ flex: 1 }} />
				{pending ? <CircularProgress size={22} sx={{ mr: 1 }} /> : null}
				<Button onClick={onClose} disabled={pending}>
					Закрыть
				</Button>
			</DialogActions>
		</Dialog>
	);
}
