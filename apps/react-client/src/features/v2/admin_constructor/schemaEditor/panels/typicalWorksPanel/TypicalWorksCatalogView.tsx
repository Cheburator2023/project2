import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { ARCH_COMPONENT_DOT } from "./typicalWorksUi";
import { shortenStreamLabel, streamColor, streamDisplayLabel } from "./typicalWorksAreas";

type TypicalWorksCatalogViewProps = {
	works: V2TypicalWorkListItemDto[];
	onAssign: (workId: string) => void;
	onCreateWork: () => void;
};

export function TypicalWorksCatalogView({
	works,
	onAssign,
	onCreateWork,
}: TypicalWorksCatalogViewProps) {
	const [query, setQuery] = useState("");
	const [archFilter, setArchFilter] = useState("all");

	const archComponents = useMemo(() => {
		const set = new Set(works.map((w) => w.archComponentType));
		return [...set].sort((a, b) => a.localeCompare(b, "ru"));
	}, [works]);

	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		return works.filter((work) => {
			if (archFilter !== "all" && work.archComponentType !== archFilter) return false;
			if (q && !work.name.toLowerCase().includes(q)) return false;
			return true;
		});
	}, [archFilter, query, works]);

	return (
		<Box sx={{ height: "100%", overflowY: "auto", px: 2.5, py: 2 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					flexWrap: "wrap",
					mb: 1.75,
				}}
			>
				<TextField
					size="small"
					placeholder="Поиск типовой работы…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ flex: 1, maxWidth: 360 }}
				/>
				<Typography sx={{ fontSize: 12, color: "#8a93a3" }}>
					<b style={{ color: "#1d2435" }}>{works.length}</b> работ в справочнике
				</Typography>
				<Button
					onClick={onCreateWork}
					sx={{
						ml: "auto",
						textTransform: "none",
						height: 36,
						px: 1.9,
						borderRadius: "9px",
						bgcolor: "#1c2333",
						color: "#fff",
						fontWeight: 600,
					}}
				>
					+ Новая работа
				</Button>
			</Box>

			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.75 }}>
				<Button
					size="small"
					onClick={() => setArchFilter("all")}
					sx={{
						textTransform: "none",
						height: 28,
						borderRadius: "8px",
						bgcolor: archFilter === "all" ? "#1c2333" : "#fff",
						color: archFilter === "all" ? "#fff" : "#5b6577",
						border: `1px solid ${archFilter === "all" ? "#1c2333" : "#dfe2ea"}`,
					}}
				>
					Все
				</Button>
				{archComponents.map((arch) => (
					<Button
						key={arch}
						size="small"
						onClick={() => setArchFilter(arch)}
						sx={{
							textTransform: "none",
							height: 28,
							borderRadius: "8px",
							bgcolor: archFilter === arch ? "#1c2333" : "#fff",
							color: archFilter === arch ? "#fff" : "#5b6577",
							border: `1px solid ${archFilter === arch ? "#1c2333" : "#dfe2ea"}`,
						}}
					>
						{arch}
					</Button>
				))}
			</Box>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
					gap: 1.5,
				}}
			>
				{rows.map((work) => {
					const dot = ARCH_COMPONENT_DOT[work.archComponentType] ?? "#94a3b8";
					const assigned = work.streams.length > 0;
					return (
						<Box
							key={work.id}
							sx={{
								bgcolor: "#fff",
								border: "1px solid #e6e8ee",
								borderRadius: "12px",
								p: "14px 15px",
								display: "flex",
								flexDirection: "column",
								gap: 1.1,
							}}
						>
							<Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#1d2435" }}>
								{work.name}
							</Typography>
							<Box sx={{ display: "flex", alignItems: "center", gap: 0.9, flexWrap: "wrap" }}>
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										gap: 0.75,
										height: 21,
										px: 1.1,
										borderRadius: "6px",
										bgcolor: `${dot}1f`,
										color: dot,
										fontSize: 10.5,
										fontWeight: 700,
									}}
								>
									<Box sx={{ width: 6, height: 6, borderRadius: "2px", bgcolor: dot }} />
									{work.archComponentType}
								</Box>
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										height: 21,
										px: 1.1,
										borderRadius: "6px",
										bgcolor: assigned ? "#eaf6ef" : "#fdf3e0",
										color: assigned ? "#1f8a4d" : "#b5791f",
										fontSize: 10.5,
										fontWeight: 600,
									}}
								>
									{assigned
										? `назначена · ${work.streams.length} ${work.streams.length === 1 ? "стрим" : "стрима"}`
										: "не назначена"}
								</Box>
							</Box>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
								{work.streams.slice(0, 4).map((stream) => (
									<Box
										key={stream}
										sx={{
											display: "inline-flex",
											alignItems: "center",
											gap: 0.6,
											height: 19,
											px: 0.9,
											borderRadius: "5px",
											bgcolor: "#f1f3f7",
											fontSize: 10,
											color: "#5b6577",
										}}
									>
										<Box
											sx={{
												width: 5,
												height: 5,
												borderRadius: "2px",
												bgcolor: streamColor(stream),
											}}
										/>
										{shortenStreamLabel(streamDisplayLabel(stream), 18)}
									</Box>
								))}
							</Box>
							<Button
								onClick={() => onAssign(work.id)}
								sx={{
									mt: 0.25,
									textTransform: "none",
									height: 32,
									border: "1px solid #dfe2ea",
									borderRadius: "8px",
									color: "#384152",
									fontWeight: 600,
								}}
							>
								Назначить на стрим →
							</Button>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
