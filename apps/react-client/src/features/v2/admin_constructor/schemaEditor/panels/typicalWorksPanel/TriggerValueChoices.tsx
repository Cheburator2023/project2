import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import type { FilterOptionsState } from "@mui/material/useAutocomplete";
import {
	catalogValueMatchesTriggerRule,
	type V2TypicalWorkRuleDto,
	type V2WorkRuleOperator,
} from "@smart-anketa/api-contract";
import { memo, useMemo } from "react";

type CatalogValue = { code: string; label: string };

/** Выше порога — поиск вместо сетки чипов (enum 1…99 и т.п.). */
export const TRIGGER_VALUE_CHIPS_MAX = 16;

/** Сколько пунктов показывать в выпадашке без поискового запроса. */
const DROPDOWN_IDLE_LIMIT = 35;
/** Лимит совпадений при поиске. */
const DROPDOWN_SEARCH_LIMIT = 50;

const CHIP_BUTTON_SX = {
	display: "inline-flex",
	alignItems: "center",
	gap: 0.75,
	height: 30,
	px: 1.4,
	borderRadius: "8px",
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 12,
	border: "1px solid",
} as const;

export function resolveSelectedCatalogValueCodes(
	values: readonly CatalogValue[],
	paramRules: readonly V2TypicalWorkRuleDto[],
	ruleSeed: { paramCode: string; paramName: string | null },
): Set<string> {
	const selected = new Set<string>();
	if (paramRules.length === 0) return selected;

	const addRaw = (code: string | null | undefined) => {
		const trimmed = code?.trim();
		if (trimmed) selected.add(trimmed);
	};

	if (values.length === 0) {
		const multi = paramRules[0]?.values;
		if (multi && multi.length > 0) {
			for (const item of multi) addRaw(item.code);
		} else {
			for (const rule of paramRules) addRaw(rule.valueCode);
		}
		return selected;
	}

	const byCode = new Map(values.map((value) => [value.code, value]));
	const byCodeLower = new Map(
		values.map((value) => [value.code.toLowerCase(), value]),
	);

	const resolveOne = (
		valueCode: string | null | undefined,
		valueLabel: string | null | undefined,
	) => {
		const code = valueCode?.trim();
		if (code && byCode.has(code)) {
			selected.add(code);
			return;
		}
		if (code) {
			const caseInsensitive = byCodeLower.get(code.toLowerCase());
			if (caseInsensitive) {
				selected.add(caseInsensitive.code);
				return;
			}
		}
		if (!valueCode && !valueLabel) return;
		const match = values.find((value) =>
			catalogValueMatchesTriggerRule(value, {
				...ruleSeed,
				valueCode: valueCode ?? null,
				valueLabel: valueLabel ?? null,
			}),
		);
		if (match) selected.add(match.code);
		else addRaw(code);
	};

	const multi = paramRules[0]?.values;
	if (multi && multi.length > 0) {
		for (const item of multi) {
			resolveOne(item.code, item.label);
		}
		return selected;
	}

	for (const rule of paramRules) {
		resolveOne(rule.valueCode, rule.valueLabel);
	}
	return selected;
}

function filterCatalogValues(
	options: CatalogValue[],
	state: FilterOptionsState<CatalogValue>,
	selectedCodes: Set<string>,
): CatalogValue[] {
	const q = state.inputValue.trim().toLowerCase();
	if (!q) {
		const selected = options.filter((option) => selectedCodes.has(option.code));
		const rest = options
			.filter((option) => !selectedCodes.has(option.code))
			.slice(0, DROPDOWN_IDLE_LIMIT);
		return [...selected, ...rest];
	}
	return options
		.filter(
			(option) =>
				option.label.toLowerCase().includes(q) ||
				option.code.toLowerCase().includes(q),
		)
		.slice(0, DROPDOWN_SEARCH_LIMIT);
}

type TriggerValueChoicesProps = {
	values: readonly CatalogValue[];
	paramRules: readonly V2TypicalWorkRuleDto[];
	ruleSeed: { paramCode: string; paramName: string | null };
	operator: V2WorkRuleOperator;
	onToggle: (value: CatalogValue, selected: boolean) => void;
	onReplace: (next: CatalogValue[]) => void;
};

export const TriggerValueChoices = memo(function TriggerValueChoices({
	values,
	paramRules,
	ruleSeed,
	operator,
	onToggle,
	onReplace,
}: TriggerValueChoicesProps) {
	const selectedCodes = useMemo(
		() => resolveSelectedCatalogValueCodes(values, paramRules, ruleSeed),
		[values, paramRules, ruleSeed],
	);
	const selectedValues = useMemo(
		() => values.filter((value) => selectedCodes.has(value.code)),
		[values, selectedCodes],
	);
	const isAnyOf = operator === "in" || operator === "not_in";
	const options = values as CatalogValue[];

	if (values.length === 0) return null;

	if (values.length > TRIGGER_VALUE_CHIPS_MAX) {
		const filterOptions = (
			opts: CatalogValue[],
			state: FilterOptionsState<CatalogValue>,
		) => filterCatalogValues(opts, state, selectedCodes);

		if (!isAnyOf) {
			return (
				<Autocomplete
					options={options}
					value={selectedValues[0] ?? null}
					filterOptions={filterOptions}
					getOptionLabel={(option) => option.label}
					isOptionEqualToValue={(a, b) => a.code === b.code}
					ListboxProps={{ style: { maxHeight: 280 } }}
					size="small"
					fullWidth
					onChange={(_event, next) => onReplace(next ? [next] : [])}
					renderInput={(params) => (
						<TextField
							{...params}
							placeholder="Начните вводить значение…"
							helperText={
								values.length > DROPDOWN_IDLE_LIMIT
									? `${values.length} значений — введите текст для поиска`
									: undefined
							}
							sx={{
								bgcolor: "#fff",
								"& .MuiInputBase-root": { fontSize: 12.5 },
								"& .MuiFormHelperText-root": { mx: 0, mt: 0.5 },
							}}
						/>
					)}
				/>
			);
		}

		return (
			<Autocomplete
				multiple
				options={options}
				value={selectedValues}
				filterOptions={filterOptions}
				getOptionLabel={(option) => option.label}
				isOptionEqualToValue={(a, b) => a.code === b.code}
				disableCloseOnSelect
				filterSelectedOptions={false}
				ListboxProps={{ style: { maxHeight: 280 } }}
				size="small"
				fullWidth
				limitTags={3}
				onChange={(_event, next) => onReplace(next)}
				renderTags={(tagValue, getTagProps) =>
					tagValue.map((option, index) => (
						<Chip
							{...getTagProps({ index })}
							key={option.code}
							size="small"
							label={option.label}
						/>
					))
				}
				renderInput={(params) => (
					<TextField
						{...params}
						placeholder="Поиск значения…"
						helperText={
							values.length > DROPDOWN_IDLE_LIMIT
								? `${values.length} значений — введите текст для поиска`
								: undefined
						}
						sx={{
							bgcolor: "#fff",
							"& .MuiInputBase-root": { fontSize: 12.5 },
							"& .MuiFormHelperText-root": { mx: 0, mt: 0.5 },
						}}
					/>
				)}
			/>
		);
	}

	return (
		<Box
			sx={{
				display: "flex",
				flexWrap: "wrap",
				gap: 0.75,
				maxHeight: 180,
				overflowY: "auto",
			}}
		>
			{values.map((value) => {
				const selected = selectedCodes.has(value.code);
				return (
					<Box
						key={value.code}
						component="button"
						type="button"
						onClick={() => onToggle(value, selected)}
						sx={{
							...CHIP_BUTTON_SX,
							fontWeight: selected ? 700 : 500,
							bgcolor: selected ? "#fff7ed" : "#fff",
							color: selected ? "#9a5b13" : "#5b6577",
							borderColor: selected ? "#e8c9a0" : "#dfe2ea",
						}}
					>
						<span>{selected ? "[v]" : "[ ]"}</span>
						{value.label}
					</Box>
				);
			})}
		</Box>
	);
});
