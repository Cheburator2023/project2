import { Grid, TextField, MenuItem } from "@mui/material";
export interface Parameter {
	label: string;
	value: string;
	options?: string[];
}
export const ParameterGrid = ({ items }: { items: Parameter[] }) => (
	<Grid container spacing={2}>
		{items.map((i) => (
			<Grid xs={4} key={i.label}>
				<TextField
					fullWidth
					size="small"
					label={i.label}
					value={i.value}
					select={!!i.options}
				>
					{i.options?.map((o) => (
						<MenuItem key={o} value={o}>
							{o}
						</MenuItem>
					))}
				</TextField>
			</Grid>
		))}
	</Grid>
);
