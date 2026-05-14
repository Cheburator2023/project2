import { Typography, Box, IconButton } from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { Flex } from "@react-client/common/primitives/Flex";

interface V2FieldTreeItemProps {
	fieldName: string;
	fieldType: string;
	isExpanded: boolean;
	onToggle: () => void;
	onSelect: () => void;
	isSelected: boolean;
}

export const V2FieldTreeItem = ({
	fieldName,
	fieldType,
	isExpanded,
	onToggle,
	onSelect,
	isSelected,
}: V2FieldTreeItemProps) => {
	return (
		<Box
			sx={{
				p: 1,
				pl: 2,
				cursor: "pointer",
				bgcolor: isSelected ? "action.selected" : "transparent",
				"&:hover": {
					bgcolor: "action.hover",
				},
			}}
			onClick={onSelect}
		>
			<Flex alignItems="center" gap={1}>
				<IconButton
					size="small"
					onClick={(e) => {
						e.stopPropagation();
						onToggle();
					}}
				>
					{isExpanded ? <ExpandLess /> : <ExpandMore />}
				</IconButton>
				<Typography variant="body2">{fieldName}</Typography>
				<Typography variant="caption" color="textSecondary">
					({fieldType})
				</Typography>
			</Flex>
		</Box>
	);
};
