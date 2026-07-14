import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { formatTypicalWorkSummaryTotal } from "../utils/anketaModalArrayTableConfig";

type Props = {
	total: number | null;
	loading?: boolean;
	"data-test-id"?: string;
	sx?: SxProps<Theme>;
};

/** Строка «Суммарный итог» для типовых работ (холст, превью, анкета). */
export function TypicalWorkSummaryTotal({
	total,
	loading = false,
	"data-test-id": dataTestId,
	sx,
}: Props) {
	const totalLabel = formatTypicalWorkSummaryTotal(total, { loading });

	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 1,
				...sx,
			}}
		>
			<Typography variant="body2" color="text.secondary" fontWeight={500}>
				Суммарный итог
			</Typography>
			<Typography
				variant="body2"
				fontWeight={700}
				sx={{ fontFamily: "monospace", color: "text.primary" }}
			>
				{totalLabel} ч/д
			</Typography>
		</Box>
	);
}
