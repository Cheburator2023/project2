import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { IS_DEV } from "@react-client/common/constants/dev";
import {
	formatPathInfluenceHint,
	lookupPathInfluence,
	type PathCalculationInfluence,
} from "../utils/anketaCalculationDev.util";
import { readAnketaFormContext } from "../utils/anketaFormContext";

export function AnketaCalculationDevHint({
	pathKey,
	formContext,
	influence: influenceProp,
}: {
	pathKey: string;
	formContext?: unknown;
	influence?: PathCalculationInfluence | null;
}) {
	if (!IS_DEV || !pathKey) return null;

	const ctx = readAnketaFormContext(formContext);
	const influence =
		influenceProp ??
		(ctx.devCalculationInfluence
			? lookupPathInfluence(ctx.devCalculationInfluence, pathKey)
			: null);

	if (!influence) return null;

	const hint = formatPathInfluenceHint(influence);
	if (!hint) return null;

	return (
		<Box
			title={`Влияние на калькуляцию (${pathKey})`}
			sx={{
				mt: 0.5,
				px: 0.75,
				py: 0.25,
				borderRadius: 1,
				bgcolor: "warning.main",
				color: "warning.contrastText",
				opacity: ctx.devCalculationLoading ? 0.65 : 1,
				fontFamily: "monospace",
				fontSize: 10,
				lineHeight: 1.45,
				wordBreak: "break-word",
			}}
		>
			<Typography component="span" sx={{ font: "inherit", color: "inherit" }}>
				⚙ calc · {hint}
			</Typography>
		</Box>
	);
}
