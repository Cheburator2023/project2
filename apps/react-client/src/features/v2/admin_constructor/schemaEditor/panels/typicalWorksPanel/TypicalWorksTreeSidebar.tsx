import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { ARCH_COMPONENT_DOT, archComponentShortLabel } from "./typicalWorksUi";

type TypicalWorksTreeSidebarProps = {
	groups: Array<{
		archComponentType: string;
		works: V2TypicalWorkListItemDto[];
	}>;
	selectedWorkId: string | null;
	onSelectWork: (workId: string) => void;
	onAssignFromCatalog: () => void;
	onDeleteWork: (work: V2TypicalWorkListItemDto) => void;
	assignedCount: number;
	scopeSubtitle: string;
};

export function TypicalWorksTreeSidebar({
	groups,
	selectedWorkId,
	onSelectWork,
	onAssignFromCatalog,
	onDeleteWork,
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
												alignItems: "flex-start",
												gap: 1,
											}}
										>
											<Box sx={{ flex: 1, minWidth: 0 }}>
												<Typography
													sx={{
														fontSize: 12,
														color: "#28303f",
														lineHeight: 1.3,
													}}
												>
													{work.name}
												</Typography>
											</Box>
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
