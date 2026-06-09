import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { uncertaintySummaryText } from "../organisms/AnketaFormModals";
import { readAnketaFormContextFromRjsfProps } from "../utils/anketaFormContext";
import type { WidgetProps } from "@rjsf/utils";

/** Кнопка «Рассчитать общую неопределённость» + модалка (как uncertaintySlot в анкете). */
export function V2UncertaintyModalWidget(props: WidgetProps) {
	const ctx = readAnketaFormContextFromRjsfProps(props);
	const readOnly =
		ctx.anketaReadOnly === true || props.disabled || props.readonly;
	const summary = uncertaintySummaryText(ctx.formData ?? {});

	return (
		<Flex
			gap={1.5}
			alignItems="center"
			justifyContent="space-between"
			sx={{ width: "100%" }}
		>
			<Typography variant="body2" color="text.secondary">
				Общая неопределенность: {summary}
			</Typography>
			<Box>
				<Button
					variant="outlined"
					size="small"
					startIcon={<CalculateOutlinedIcon />}
					disabled={readOnly}
					onClick={() => ctx.openUncertaintyModal?.()}
					sx={{ textTransform: "uppercase", fontWeight: 600 }}
				>
					Рассчитать общую неопределенность
				</Button>
			</Box>
		</Flex>
	);
}
