import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { usePatchV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { useV2ImplementationStreamCatalog } from "@react-client/common/api/queries/v2-streams";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { ARCH_COMPONENT_DOT } from "./typicalWorksUi";
import {
	isWorkAssignedToLogicStream,
	pickDbStreamForLogicStream,
	shortenStreamLabel,
	streamColor,
	streamDisplayLabel,
} from "./typicalWorksAreas";
import {
	buildAssignWorkPatch,
	inferBaseNormValue,
} from "./typicalWorksAssignment";

type TypicalWorksMatrixViewProps = {
	works: V2TypicalWorkListItemDto[];
	templateVersionId: string | null;
	onOpenWork: (workId: string, streamExecutor: string) => void;
};

function triggerDotColor(status: V2TypicalWorkListItemDto["triggerStatus"]): string {
	switch (status) {
		case "appears":
			return "#1f8a4d";
		case "invalid":
			return "#c2554c";
		default:
			return "#e0922f";
	}
}

export function TypicalWorksMatrixView({
	works,
	templateVersionId,
	onOpenWork,
}: TypicalWorksMatrixViewProps) {
	const patch = usePatchV2TypicalWork();
	const { codes: logicStreams, catalog } = useV2ImplementationStreamCatalog();

	const handleAssign = async (
		work: V2TypicalWorkListItemDto,
		logicStream: string,
	) => {
		const streamExecutor = pickDbStreamForLogicStream(
			logicStream,
			work.streams,
			catalog,
		);
		if (work.streams.includes(streamExecutor)) return;
		try {
			await patch.mutateAsync({
				workId: work.id,
				dto: {
					...buildAssignWorkPatch(streamExecutor, inferBaseNormValue(work)),
					templateVersionId: templateVersionId ?? undefined,
				},
			});
			toast.success(
				`«${work.name}» назначена на «${streamDisplayLabel(logicStream, catalog)}»`,
			);
			onOpenWork(work.id, streamExecutor);
		} catch (err) {
			toast.error("Не удалось назначить работу", {
				description: apiErrorMessage(err),
			});
		}
	};

	return (
		<Box sx={{ height: "100%", overflow: "auto", p: 2 }}>
			<Typography sx={{ fontSize: 12, color: "#6b7484", mb: 1.5 }}>
				Строки — типовые работы справочника, столбцы — стримы. В ячейке норматив на
				сегодня и статус условий; пустая ячейка — назначить работу на стрим.
			</Typography>
			<Box
				sx={{
					display: "inline-block",
					minWidth: "100%",
					border: "1px solid #e6e8ee",
					borderRadius: "12px",
					overflow: "hidden",
					bgcolor: "#fff",
				}}
			>
				<Box sx={{ display: "flex", bgcolor: "#f6f8fb", borderBottom: "1px solid #e6e8ee" }}>
					<Box
						sx={{
							width: 280,
							flexShrink: 0,
							p: "10px 14px",
							fontSize: 11,
							fontWeight: 700,
							color: "#8a93a3",
							textTransform: "uppercase",
							borderRight: "1px solid #eef0f4",
						}}
					>
						Типовая работа
					</Box>
					{logicStreams.map((stream) => (
						<Box
							key={stream}
							sx={{
								width: 108,
								flexShrink: 0,
								p: "10px 8px",
								textAlign: "center",
								borderRight: "1px solid #eef0f4",
							}}
						>
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									gap: 0.5,
									fontSize: 10.5,
									fontWeight: 700,
									color: "#5b6577",
									lineHeight: 1.2,
								}}
							>
								<Box
									sx={{
										width: 7,
										height: 7,
										borderRadius: "2px",
										bgcolor: streamColor(stream),
									}}
								/>
								{shortenStreamLabel(stream, 16, catalog)}
							</Box>
						</Box>
					))}
				</Box>

				{works.map((work) => {
					const compDot = ARCH_COMPONENT_DOT[work.archComponentType] ?? "#94a3b8";
					return (
						<Box
							key={work.id}
							sx={{
								display: "flex",
								borderBottom: "1px solid #f3f4f8",
							}}
						>
							<Box
								sx={{
									width: 280,
									flexShrink: 0,
									p: "9px 14px",
									borderRight: "1px solid #eef0f4",
								}}
							>
								<Typography sx={{ fontSize: 12, color: "#28303f", lineHeight: 1.3 }}>
									{work.name}
								</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.4 }}>
									<Box
										sx={{
											width: 6,
											height: 6,
											borderRadius: "2px",
											bgcolor: compDot,
										}}
									/>
									<Typography sx={{ fontSize: 10, color: "#aab1c0" }}>
										{work.archComponentType}
									</Typography>
								</Box>
							</Box>

							{logicStreams.map((logicStream) => {
								const assigned = isWorkAssignedToLogicStream(
									work.streams,
									logicStream,
								);
								const dbStream = pickDbStreamForLogicStream(
									logicStream,
									work.streams,
									catalog,
								);
								const norm =
									work.normsByStream?.[dbStream] ??
									work.streams
										.filter((s) => isWorkAssignedToLogicStream([s], logicStream))
										.map((s) => work.normsByStream?.[s])
										.find((v) => typeof v === "number") ??
									null;

								return (
									<Box
										key={`${work.id}-${logicStream}`}
										sx={{
											width: 108,
											flexShrink: 0,
											borderRight: "1px solid #eef0f4",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											p: 0.75,
										}}
									>
										{assigned ? (
											<Box
												component="button"
												type="button"
												onClick={() => onOpenWork(work.id, dbStream)}
												sx={{
													display: "inline-flex",
													alignItems: "center",
													gap: 0.75,
													height: 28,
													px: 1.25,
													borderRadius: "8px",
													bgcolor: "#f3f9f5",
													border: "1px solid #e6e8ee",
													cursor: "pointer",
													fontFamily: "inherit",
												}}
											>
												<Box
													sx={{
														width: 7,
														height: 7,
														borderRadius: "50%",
														bgcolor: triggerDotColor(work.triggerStatus),
													}}
												/>
												<Typography
													sx={{
														fontSize: 12,
														fontWeight: 700,
														fontFamily: "monospace",
														color: "#1d2435",
													}}
												>
													{norm ?? "—"}
												</Typography>
											</Box>
										) : (
											<Box
												component="button"
												type="button"
												title="Назначить на стрим"
												onClick={() => void handleAssign(work, logicStream)}
												sx={{
													display: "inline-flex",
													alignItems: "center",
													justifyContent: "center",
													width: 28,
													height: 28,
													borderRadius: "8px",
													border: "1px dashed #d2d7e0",
													color: "#b3bac6",
													cursor: "pointer",
													fontSize: 15,
													fontFamily: "inherit",
													bgcolor: "transparent",
												}}
											>
												+
											</Box>
										)}
									</Box>
								);
							})}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
