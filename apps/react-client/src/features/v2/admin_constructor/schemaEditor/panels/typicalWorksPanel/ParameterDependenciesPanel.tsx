import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useV2ParameterDependencies } from "@react-client/common/api/queries/v2-works";

export function ParameterDependenciesPanel() {
	const { data, isLoading, error } = useV2ParameterDependencies();

	if (isLoading) {
		return (
			<Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				Не удалось загрузить зависимости параметров.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: 2 }}>
			<Typography variant="subtitle1" fontWeight={700} gutterBottom>
				Зависимости параметров
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Методологические описания и атрибуты параметров из каталога. Полноценный
				редактор связей — в следующей итерации.
			</Typography>
			<Paper variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Параметр</TableCell>
							<TableCell>Описание / атрибуты</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{(data?.items ?? []).map((item) => (
							<TableRow key={item.paramCode}>
								<TableCell>{item.paramName}</TableCell>
								<TableCell>{item.description ?? "—"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Paper>
		</Box>
	);
}
