import { Button } from "@mui/material";
import { routes } from "@react-client/routing/routes";
import type { ICellRendererParams } from "ag-grid-community";
import { useNavigate } from "react-router";

export const CalculationPreviewCell = (props: ICellRendererParams) => {
	const isRowHovered = props.node.id === (props as any).hoveredRowId;

	console.log("🐸 Pepe said >> HomePage >> hoveredRowId:", props);

	console.log(
		"🐸 Pepe said >> CalculationPreviewCell >> props.node.id:",
		props.node.id,
	);

	const navigate = useNavigate();

	return isRowHovered ? (
		<Button
			variant={"contained"}
			size="small"
			fullWidth
			onClick={() => {
				navigate(
					routes.calculationPreview.rootPath.replace(
						":id",
						props?.data?.id?.toString(),
					),
				);
			}}
		>
			Просмотр
		</Button>
	) : null;
};
