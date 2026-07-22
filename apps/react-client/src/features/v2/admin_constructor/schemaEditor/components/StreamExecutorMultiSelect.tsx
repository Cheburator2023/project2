import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	isExecutorStreamPresentInSchema,
	resolveStreamBlockExecutorsLabel,
	serializeStreamBlockExecutors,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";
import { ExecutorStreamPresenceLabel } from "../panels/typicalWorksPanel/ExecutorStreamPresenceLabel";

type StreamExecutorMultiSelectProps = {
	value: V2ImplementationStreamCode[];
	onChange: (value: V2ImplementationStreamCode[]) => void;
	label?: string;
	helperText?: string;
	uiSchema?: unknown;
	allowEmpty?: boolean;
	showPresence?: boolean;
	size?: "small" | "medium";
	fullWidth?: boolean;
};

export function StreamExecutorMultiSelect({
	value,
	onChange,
	label = "Стрим-исполнитель",
	helperText,
	uiSchema,
	allowEmpty = false,
	showPresence = true,
	size = "small",
	fullWidth = true,
}: StreamExecutorMultiSelectProps) {
	return (
		<TextField
			select
			fullWidth={fullWidth}
			size={size}
			label={label}
			value={value}
			helperText={helperText}
			SelectProps={{
				multiple: true,
				renderValue: (selected) =>
					resolveStreamBlockExecutorsLabel(selected as string[]),
			}}
			onChange={(event) => {
				const raw = event.target.value;
				const next =
					typeof raw === "string"
						? (raw.split(",") as V2ImplementationStreamCode[])
						: (raw as V2ImplementationStreamCode[]);
				if (!allowEmpty && next.length === 0) return;
				onChange(next);
			}}
		>
			{V2_IMPLEMENTATION_STREAM_CODES.map((code) => (
				<MenuItem key={code} value={code}>
					<Checkbox checked={value.includes(code)} size="small" sx={{ p: 0.5 }} />
					<ListItemText
						primary={V2_IMPLEMENTATION_STREAM_LABELS[code]}
						primaryTypographyProps={{ fontSize: 13 }}
					/>
					{showPresence && uiSchema ? (
						<Flex sx={{ ml: 1 }}>
							<ExecutorStreamPresenceLabel
								present={isExecutorStreamPresentInSchema(uiSchema, code)}
							/>
						</Flex>
					) : null}
				</MenuItem>
			))}
		</TextField>
	);
}

export function streamExecutorsToUiValue(
	executors: readonly V2ImplementationStreamCode[],
) {
	return serializeStreamBlockExecutors(executors);
}
