import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

type TypicalWorksEmptyStateProps = {
	areaTitle: string;
	onCreateWork: () => void;
};

export function TypicalWorksEmptyState({
	areaTitle,
	onCreateWork,
}: TypicalWorksEmptyStateProps) {
	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				p: 4,
			}}
		>
			<Box sx={{ maxWidth: 440, textAlign: "center" }}>
				<Box
					sx={{
						width: 64,
						height: 64,
						borderRadius: "16px",
						bgcolor: "#eef2f8",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						mx: "auto",
						mb: 2.25,
						color: "#8a93a3",
						fontSize: 28,
					}}
				>
					▤
				</Box>
				<Typography sx={{ fontSize: 17, fontWeight: 800, color: "#1d2435", mb: 1 }}>
					Для «{areaTitle}» ещё нет работ
				</Typography>
				<Typography
					sx={{ fontSize: 13, color: "#6b7484", lineHeight: 1.5, mb: 2.5 }}
				>
					Типовые работы хранятся в общем справочнике. Выберите нужные и назначьте
					на эту область — у каждой работы будут свои нормативы и логика именно для
					этого стрима.
				</Typography>
				<Box
					sx={{
						display: "flex",
						gap: 1.1,
						justifyContent: "center",
						flexWrap: "wrap",
					}}
				>
					<Button
						variant="contained"
						onClick={onCreateWork}
						sx={{
							textTransform: "none",
							height: 40,
							px: 2.25,
							borderRadius: "9px",
							bgcolor: "#1c2333",
							fontWeight: 600,
						}}
					>
						Создать новую работу
					</Button>
				</Box>
			</Box>
		</Box>
	);
}
