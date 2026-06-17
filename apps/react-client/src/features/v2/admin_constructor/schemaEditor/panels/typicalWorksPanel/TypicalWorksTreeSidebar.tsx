import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	ARCH_COMPONENT_DOT,
	triggerStatusColors,
	triggerStatusLabel,
} from "./typicalWorksUi";

type TypicalWorksTreeSidebarProps = {
	groups: Array<{
		archComponentType: string;
		works: V2TypicalWorkListItemDto[];
	}>;
	selectedWorkId: string | null;
	collapsedGroups: Record<string, boolean>;
	onToggleGroup: (archComponentType: string) => void;
	onSelectWork: (workId: string) => void;
	onCreateWork: () => void;
	onDeleteWork: (work: V2TypicalWorkListItemDto) => void;
	streamFilter: string | null;
};

export function TypicalWorksTreeSidebar({
	groups,
	selectedWorkId,
	collapsedGroups,
	onToggleGroup,
	onSelectWork,
	onCreateWork,
	onDeleteWork,
	streamFilter,
}: TypicalWorksTreeSidebarProps) {
	return (
		<Box
			sx={{
				width: 330,
				flexShrink: 0,
				borderRight: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<Box
				sx={{
					px: 1.75,
					py: 1.25,
					borderBottom: 1,
					borderColor: "divider",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography variant="subtitle2" fontWeight={700}>
					Арх. компоненты
				</Typography>
				<Chip
					size="small"
					label="+ Работа"
					variant="outlined"
					clickable
					onClick={onCreateWork}
					title="Создать новую типовую работу"
				/>
			</Box>

			<Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
				{groups.map((group) => {
					const collapsed = collapsedGroups[group.archComponentType] ?? false;
					const dot = ARCH_COMPONENT_DOT[group.archComponentType] ?? "#94a3b8";

					return (
						<Box key={group.archComponentType} sx={{ mb: 0.75 }}>
							<Box
								onClick={() => onToggleGroup(group.archComponentType)}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									px: 1.25,
									py: 1,
									borderRadius: 1,
									cursor: "pointer",
									bgcolor: "action.hover",
									border: 1,
									borderColor: "divider",
								}}
							>
								<Typography
									component="span"
									sx={{
										color: "text.secondary",
										fontSize: 11,
										transform: collapsed ? "none" : "rotate(90deg)",
									}}
								>
									▸
								</Typography>
								<Box
									sx={{
										width: 9,
										height: 9,
										borderRadius: 0.5,
										bgcolor: dot,
										flexShrink: 0,
									}}
								/>
								<Typography
									variant="body2"
									fontWeight={700}
									sx={{ flex: 1, minWidth: 0 }}
								>
									{group.archComponentType}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{group.works.length}
								</Typography>
							</Box>

							{!collapsed
								? group.works.map((work) => {
										const selected = work.id === selectedWorkId;
										const statusColors = triggerStatusColors(work.triggerStatus);
										const streamBadge =
											streamFilter &&
											work.streams.includes(streamFilter)
												? streamFilter
												: work.streams[0] ?? null;

										return (
											<Box
												key={work.id}
												onClick={() => onSelectWork(work.id)}
												sx={{
													ml: 0.75,
													mt: 0.25,
													px: 1.1,
													py: 1,
													borderRadius: 1,
													cursor: "pointer",
													border: 1,
													borderColor: selected ? "#bcd3f5" : "transparent",
													bgcolor: selected ? "#eef4ff" : "transparent",
													"&:hover": {
														bgcolor: selected ? "#eef4ff" : "action.hover",
													},
												}}
											>
												<Box
													sx={{
														display: "flex",
														alignItems: "flex-start",
														gap: 0.5,
													}}
												>
													<Typography
														variant="body2"
														sx={{ flex: 1, lineHeight: 1.35 }}
													>
														{work.name}
													</Typography>
													<Typography
														variant="body2"
														fontWeight={800}
														sx={{ fontFamily: "monospace", flexShrink: 0 }}
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
														sx={{ mt: -0.5, mr: -0.5 }}
													>
														<DeleteOutlineIcon fontSize="small" />
													</IconButton>
												</Box>
												<Box
													sx={{
														display: "flex",
														flexWrap: "wrap",
														gap: 0.5,
														mt: 0.6,
													}}
												>
													{streamBadge ? (
														<Chip
															size="small"
															label={streamBadge}
															sx={{
																height: 18,
																fontSize: 10,
																bgcolor: "#eef6f1",
																color: "#1f8a4d",
															}}
														/>
													) : null}
													<Chip
														size="small"
														label={triggerStatusLabel(work.triggerStatus)}
														sx={{
															height: 18,
															fontSize: 10,
															fontWeight: 700,
															bgcolor: statusColors.bg,
															color: statusColors.color,
														}}
													/>
												</Box>
											</Box>
										);
									})
								: null}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
