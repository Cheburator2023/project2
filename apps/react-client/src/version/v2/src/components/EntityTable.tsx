import { DataGrid } from "@mui/x-data-grid";
import { Button, Stack, Typography } from "@mui/material";
export function EntityTable({ title, rows, columns, addLabel }: any) {
	return (
		<Stack spacing={2}>
			<Typography variant="h6">{title}</Typography>
			<DataGrid autoHeight rows={rows} columns={columns} />
			<Button>{addLabel}</Button>
		</Stack>
	);
}
