import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import type { NodeModel } from "@minoru/react-dnd-treeview";
import type { SchemaCanvasNodeData } from "../schemaCanvasTree";

const DEPTH_INDENT_PX = 12;

/** Широкий «призрак» строки — куда встанет элемент (вместо тонкой линии). */
export function SchemaCanvasPlaceholder({
	depth,
}: {
	node: NodeModel<SchemaCanvasNodeData>;
	depth: number;
}) {
	const theme = useTheme();

	return (
		<Box
			role="presentation"
			aria-hidden
			data-test-id="schema-canvas-drop-placeholder"
			sx={{
				ml: `${depth * DEPTH_INDENT_PX}px`,
				mr: 1,
				my: 0.5,
				minHeight: 52,
				borderRadius: 1,
				border: 2,
				borderStyle: "dashed",
				borderColor: alpha(theme.palette.primary.main, 0.55),
				bgcolor: alpha(theme.palette.primary.main, 0.1),
				boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.15)}`,
			}}
		/>
	);
}
