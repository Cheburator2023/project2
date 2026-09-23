import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import type { IToolPanelParams } from "ag-grid-community";
import {
	clearAgGridColumnState,
	clearAgGridFilterModel,
	loadAgGridRowTintEnabled,
	saveAgGridRowTintEnabled,
} from "@react-client/common/tableStuff/agGridColumnState";
import { useState } from "react";

type ToolPanelParams = IToolPanelParams & {
	gridStateKey?: string;
	showRowTintToggle?: boolean;
};

export function AgGridColumnStateToolPanel({
	api,
	gridStateKey,
	showRowTintToggle = false,
}: ToolPanelParams) {
	const [rowTintEnabled, setRowTintEnabled] = useState(() =>
		gridStateKey ? loadAgGridRowTintEnabled(gridStateKey) : true,
	);

	const handleReset = () => {
		if (gridStateKey) {
			clearAgGridColumnState(gridStateKey);
			clearAgGridFilterModel(gridStateKey);
		}
		api.resetColumnState();
		api.setFilterModel(null);
	};

	const handleRowTintChange = (enabled: boolean) => {
		setRowTintEnabled(enabled);
		if (gridStateKey) {
			saveAgGridRowTintEnabled(gridStateKey, enabled);
		}
		api.redrawRows();
	};

	return (
		<Stack spacing={2} sx={{ p: 1.5, minWidth: 220 }}>
			<Typography variant="subtitle1" fontWeight={700}>
				Настройки таблицы
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Порядок, ширина, видимость колонок и фильтры сохраняются в браузере.
			</Typography>
			{showRowTintToggle ? (
				<FormControlLabel
					sx={{ mr: 0 }}
					title="Красить ряды по статусу и блокеру"
					control={
						<Switch
							size="small"
							checked={rowTintEnabled}
							onChange={(event) => handleRowTintChange(event.target.checked)}
						/>
					}
					label="Подсветка строк"
				/>
			) : null}
			<Button variant="outlined" size="small" onClick={handleReset}>
				Сбросить колонки
			</Button>
		</Stack>
	);
}
