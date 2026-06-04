import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { ANKETA_MOLECULE_TEST_IDS } from "./testIds";

type Props = {
	children: ReactNode;
	"data-test-id"?: string;
};

/** Пустое состояние списка/таблицы в анкете и превью. */
export function ListEmptyPlaceholder({
	children,
	"data-test-id": dataTestId = ANKETA_MOLECULE_TEST_IDS.listEmptyPlaceholder,
}: Props) {
	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				py: 1.5,
				px: 1,
				bgcolor: "grey.50",
				borderRadius: 1.5,
				textAlign: "center",
			}}
		>
			<Typography
				variant="body2"
				color="text.secondary"
				data-test-id={`${dataTestId}--label`}
			>
				{children}
			</Typography>
		</Box>
	);
}
