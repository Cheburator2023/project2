import Typography from "@mui/material/Typography";
import type { JsonLogicValue } from "../operators.ts";
import Any from "./any";

interface Props {
	data?: Record<string, unknown> | unknown[] | undefined;
	value?: JsonLogicValue | undefined;
	onChange: (value: JsonLogicValue) => void;
}

/**
 * Reducer step for `reduce`: [array, reducer, initial].
 * JsonLogic passes `{ accumulator, current }` into the reducer on each row.
 */
export function ReduceBody({ data = {}, value, onChange }: Props) {
	return (
		<span data-rjl-reduce-body>
			<Typography
				component="span"
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mb: 0.5, maxWidth: 420 }}
			>
				На каждой строке: <code>accumulator</code> — накопленная сумма,{" "}
				<code>current</code> — элемент массива (например{" "}
				<code>current.total</code>).
			</Typography>
			<span data-rjl-reduce-body-expr>
				<Any parent="reduce" data={data} value={value} onChange={onChange} />
			</span>
		</span>
	);
}

export default ReduceBody;
