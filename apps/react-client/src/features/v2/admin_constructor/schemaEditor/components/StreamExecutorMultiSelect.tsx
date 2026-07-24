import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useV2ImplementationStreamCatalog } from "@react-client/common/api/queries/v2-streams";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	isExecutorStreamPresentInSchema,
	resolveStreamBlockExecutorsLabel,
	serializeStreamBlockExecutors,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { ExecutorStreamPresenceLabel } from "../panels/typicalWorksPanel/ExecutorStreamPresenceLabel";

type StreamExecutorMultiSelectProps = {
	value: V2ImplementationStreamCode[];
	onChange: (value: V2ImplementationStreamCode[]) => void;
	label?: string;
	helperText?: string;
	uiSchema?: unknown;
	allowEmpty?: boolean;
	showPresence?: boolean;
	/** false — один стрим (стрим-блок). default true. */
	multiple?: boolean;
	/** Коды, занятые другими блоками (недоступны для выбора). */
	excludedCodes?: readonly string[];
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
	multiple = true,
	excludedCodes = [],
	size = "small",
	fullWidth = true,
}: StreamExecutorMultiSelectProps) {
	const { codes, labelByCode, catalog } = useV2ImplementationStreamCatalog();

	const excluded = useMemo(() => new Set(excludedCodes), [excludedCodes]);

	const selectableCodes = useMemo(() => {
		const selected = new Set(value);
		return codes.filter(
			(code) => selected.has(code as V2ImplementationStreamCode) || !excluded.has(code),
		);
	}, [codes, excluded, value]);

	const singleValue = value[0] ?? "";

	if (!multiple) {
		return (
			<TextField
				select
				fullWidth={fullWidth}
				size={size}
				label={label}
				value={singleValue}
				helperText={helperText}
				SelectProps={{
					renderValue: (selected) =>
						resolveStreamBlockExecutorsLabel(
							typeof selected === "string" ? [selected] : [],
							catalog,
						),
				}}
				onChange={(event) => {
					const next = String(event.target.value).trim();
					if (!next) {
						if (allowEmpty) onChange([]);
						return;
					}
					onChange([next as V2ImplementationStreamCode]);
				}}
			>
				{allowEmpty ? (
					<MenuItem value="">
						<em>Не выбран</em>
					</MenuItem>
				) : null}
				{selectableCodes.map((code) => (
					<MenuItem key={code} value={code}>
						<ListItemText
							primary={labelByCode[code] ?? code}
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
					resolveStreamBlockExecutorsLabel(
						selected as string[],
						catalog,
					),
			}}
			onChange={(event) => {
				const raw = event.target.value;
				const next =
					typeof raw === "string"
						? (raw.split(",") as V2ImplementationStreamCode[])
						: (raw as V2ImplementationStreamCode[]);
				const filtered = next.filter((code) => !excluded.has(code));
				if (!allowEmpty && filtered.length === 0) return;
				onChange(filtered);
			}}
		>
			{selectableCodes.map((code) => (
				<MenuItem key={code} value={code}>
					<Checkbox
						checked={value.includes(code as V2ImplementationStreamCode)}
						size="small"
						sx={{ p: 0.5 }}
					/>
					<ListItemText
						primary={labelByCode[code] ?? code}
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
