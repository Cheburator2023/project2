import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	ARCH_COMPONENT_DOT,
	archComponentShortLabel,
	triggerStatusColors,
	triggerStatusLabel,
} from "./typicalWorksUi";
import {
	pickStreamForScope,
	streamColor,
	streamDisplayLabel,
} from "./typicalWorksAreas";

type TypicalWorksTreeSidebarProps = {
	groups: Array<{
		archComponentType: string;
		works: V2TypicalWorkListItemDto[];
	}>;
	selectedWorkId: string | null;
	onSelectWork: (workId: string) => void;
	onAssignFromCatalog: () => void;
	onDeleteWork: (work: V2TypicalWorkListItemDto) => void;
	scopeIsGroup: boolean;
	scopeStreams: string[];
	assignedCount: number;
	scopeSubtitle: string;
};

function laborBadgeForWork(
	work: V2TypicalWorkListItemDto,
	streamForRow: string | null,
): { label: string; bg: string; color: string } {
	const count =
		streamForRow && work.laborParamCountByStream
			? (work.laborParamCountByStream[streamForRow] ?? 0)
			: 0;
	if (count > 0) {
		return { label: `коэф.: ${count}`, bg: "#eaf6ef", color: "#1f8a4d" };
	}
	return { label: "без коэф.", bg: "#eef1f6", color: "#8a93a3" };
}

export function TypicalWorksTreeSidebar({
	groups,
	selectedWorkId,
	onSelectWork,
	onAssignFromCatalog,
	onDeleteWork,
	scopeIsGroup,
	scopeStreams,
	assignedCount,
	scopeSubtitle,
}: TypicalWorksTreeSidebarProps) {
	return (
		<Box
			sx={{
				width: 330,
				flexShrink: 0,
				borderRight: "1px solid #e6e8ee",
				bgcolor: "#fff",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<Box
				sx={{
					px: 1.75,
					py: 1.4,
					borderBottom: "1px solid #eef0f4",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Box>
					<Typography
						sx={{ fontSize: 12.5, fontWeight: 700, color: "#1d2435" }}
					>
						Работы области
					</Typography>
					<Typography sx={{ fontSize: 10.5, color: "#8a93a3", mt: 0.25 }}>
						{assignedCount} назначено · {scopeSubtitle}
					</Typography>
				</Box>
				<Button
					onClick={onAssignFromCatalog}
					sx={{
						textTransform: "none",
						height: 27,
						px: 1.25,
						borderRadius: "7px",
						bgcolor: "#1c2333",
						color: "#fff",
						fontSize: 11.5,
						fontWeight: 600,
						minWidth: 0,
					}}
				>
					+
				</Button>
			</Box>

			<Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
				{groups.map((group) => {
					const dot = ARCH_COMPONENT_DOT[group.archComponentType] ?? "#94a3b8";

					return (
						<Box key={group.archComponentType} sx={{ mb: 1 }}>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 0.9,
									px: 1,
									py: 0.75,
								}}
							>
								<Box
									sx={{
										width: 8,
										height: 8,
										borderRadius: "2px",
										bgcolor: dot,
										flexShrink: 0,
									}}
								/>
								<Typography
									sx={{
										flex: 1,
										fontSize: 11,
										fontWeight: 700,
										letterSpacing: "0.03em",
										textTransform: "uppercase",
										color: "#8a93a3",
									}}
								>
									{archComponentShortLabel(group.archComponentType)}
								</Typography>
								<Typography sx={{ fontSize: 10.5, color: "#aab1c0" }}>
									{group.works.length}
								</Typography>
							</Box>

							{group.works.map((work) => {
								const selected = work.id === selectedWorkId;
								const statusColors = triggerStatusColors(work.triggerStatus);
								const streamForRow = pickStreamForScope(
									work.streams,
									scopeStreams,
									null,
								);
								const lab = laborBadgeForWork(work, streamForRow);
								const trigLabel =
									work.triggerStatus === "appears"
										? "появляется"
										: triggerStatusLabel(work.triggerStatus);

								return (
									<Box
										key={work.id}
										onClick={() => onSelectWork(work.id)}
										sx={{
											px: 1.1,
											py: 1,
											my: 0.25,
											borderRadius: "8px",
											cursor: "pointer",
											border: `1px solid ${selected ? "#bcd3f5" : "transparent"}`,
											bgcolor: selected ? "#eef4ff" : "#fff",
											"&:hover": {
												bgcolor: selected ? "#eef4ff" : "#f8f9fb",
											},
										}}
									>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 1,
											}}
										>
											<Typography
												sx={{
													flex: 1,
													fontSize: 12,
													color: "#28303f",
													lineHeight: 1.3,
												}}
											>
												{work.name}
											</Typography>
											<Typography
												sx={{
													fontSize: 12.5,
													fontWeight: 800,
													color: "#1d2435",
													fontFamily: "monospace",
													flexShrink: 0,
												}}
											>
												{work.currentNorm ?? "—"}
											</Typography>
											<IconButton
												size="small"
												aria-label="Удалить работу"
												title="Удалить работу"
												onClick={(e) => {
													e.stopPropagation();
													onDeleteWork(work);
												}}
												sx={{ mt: -0.5, mr: -0.5, opacity: 0.55 }}
											>
												<DeleteOutlineIcon fontSize="small" />
											</IconButton>
										</Box>
										<Box
											sx={{
												display: "flex",
												flexWrap: "wrap",
												gap: 0.6,
												mt: 0.65,
											}}
										>
											{scopeIsGroup && streamForRow ? (
												<Box
													sx={{
														display: "inline-flex",
														alignItems: "center",
														gap: 0.5,
														height: 16,
														px: 0.75,
														borderRadius: "5px",
														bgcolor: "#eef4ff",
														color: "#2f6bd8",
														fontSize: 9.5,
														fontWeight: 600,
													}}
												>
													<Box
														sx={{
															width: 5,
															height: 5,
															borderRadius: "2px",
															bgcolor: streamColor(streamForRow),
														}}
													/>
													{streamDisplayLabel(streamForRow)}
												</Box>
											) : null}
											<Box
												sx={{
													display: "inline-flex",
													alignItems: "center",
													height: 16,
													px: 0.75,
													borderRadius: "5px",
													bgcolor: statusColors.bg,
													color: statusColors.color,
													fontSize: 9.5,
													fontWeight: 700,
												}}
											>
												{trigLabel}
											</Box>
											<Box
												sx={{
													display: "inline-flex",
													alignItems: "center",
													height: 16,
													px: 0.75,
													borderRadius: "5px",
													bgcolor: lab.bg,
													color: lab.color,
													fontSize: 9.5,
													fontWeight: 600,
												}}
											>
												{lab.label}
											</Box>
										</Box>
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
