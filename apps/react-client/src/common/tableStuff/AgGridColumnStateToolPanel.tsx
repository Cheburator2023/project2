import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { IToolPanelParams } from "ag-grid-community";
import { clearAgGridColumnState } from "@react-client/common/tableStuff/agGridColumnState";

type ToolPanelParams = IToolPanelParams & {
	gridStateKey?: string;
};

export function AgGridColumnStateToolPanel({ api, gridStateKey }: ToolPanelParams) {
	const handleReset = () => {
		if (gridStateKey) {
			clearAgGridColumnState(gridStateKey);
		}
		api.resetColumnState();
	};

	return (
		<Stack spacing={2} sx={{ p: 1.5, minWidth: 220 }}>
			<Typography variant="subtitle1" fontWeight={700}>
				Настройки таблицы
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Порядок и видимость колонок сохраняются автоматически в браузере.
			</Typography>
			<Button variant="outlined" size="small" onClick={handleReset}>
				Сбросить колонки
			</Button>
		</Stack>
	);
}
