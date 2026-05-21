import { Button } from "@mui/material";
import type { ICellRendererParams } from "ag-grid-community";
import { useNavigate } from "react-router";
import { routes } from "@react-client/routing/version/v1/routing/routes";

export const CalculationPreviewCell = (props: ICellRendererParams) => {
	const isRowHovered = props.node.id === (props as any).hoveredRowId;

	const navigate = useNavigate();

	return isRowHovered ? (
		<Button
			variant={"contained"}
			size="small"
			fullWidth
			sx={{
				height: "inherit",
			}}
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
	) : (
		<div />
	);
};
