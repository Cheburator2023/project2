import { Stack, Typography } from "@mui/material";
export const MetricCard = ({ label, value, trend }: any) => (
	<Stack>
		<Typography>{label}</Typography>
		<Typography variant="h5">{value}</Typography>
		{trend && <Typography>{trend}%</Typography>}
	</Stack>
);
