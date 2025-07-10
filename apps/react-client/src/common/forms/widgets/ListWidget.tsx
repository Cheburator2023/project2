import { Chip, InputLabel, List, ListItem } from "@mui/material";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { WidgetProps } from "@rjsf/utils";

export interface ListWidgetProps extends WidgetProps {}

export const ListWidget = ({ value, label, readonly }: ListWidgetProps) => {
	const items = Array.isArray(value) ? value : [];

	return (
		<>
			<InputLabel
				size="small"
				disabled={readonly}
				sx={{ fontSize: "1.25rem", fontWeight: "bold", color: "text.primary" }}
			>
				{label}
			</InputLabel>

			<Spacer space={4} />

			<List>
				{items.map((item, index) => (
					<ListItem
						key={index}
						sx={{
							paddingLeft: 1,
						}}
					>
						<Chip label={item} />
					</ListItem>
				))}
			</List>
		</>
	);
};
