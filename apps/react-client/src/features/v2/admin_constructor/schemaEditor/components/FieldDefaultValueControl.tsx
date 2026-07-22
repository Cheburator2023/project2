import Autocomplete from "@mui/material/Autocomplete";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { RJSFSchema } from "@rjsf/utils";
import type { PrimitiveFieldTypeVariant } from "../constants";
import { Flex } from "@react-client/common/primitives/Flex";

export type DictionaryEnumMap = Record<
	string,
	{ enums: string[]; enumNames: string[] }
>;

export type DefaultValueOption = {
	value: string;
	label: string;
};

type FieldDefaultValueControlProps = {
	primitiveTypeVariant: PrimitiveFieldTypeVariant;
	resolvedField: RJSFSchema | undefined;
	dictionaryCode: string | undefined;
	enumMapByCode: DictionaryEnumMap;
	onChange: (nextDefault: RJSFSchema["default"]) => void;
	disabled?: boolean;
	warningText?: string;
};

export function resolveDefaultValueOptions(
	resolvedField: RJSFSchema | undefined,
	dictionaryCode: string | undefined,
	enumMapByCode: DictionaryEnumMap,
): DefaultValueOption[] {
	const code = dictionaryCode?.trim();
	if (code && enumMapByCode[code]) {
		const pair = enumMapByCode[code]!;
		return pair.enums.map((value, index) => ({
			value,
			label: pair.enumNames[index] ?? value,
		}));
	}

	const enums = resolvedField?.enum;
	if (!Array.isArray(enums) || enums.length === 0) return [];

	const names = Array.isArray(resolvedField?.enumNames)
		? resolvedField.enumNames
		: [];
	return enums.flatMap((raw, index) => {
		if (
			typeof raw !== "string" &&
			typeof raw !== "number" &&
			typeof raw !== "boolean"
		) {
			return [];
		}
		const value = String(raw);
		const name = names[index];
		return [
			{
				value,
				label: typeof name === "string" && name.trim() ? name.trim() : value,
			},
		];
	});
}

function formatDefaultForInput(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return "";
}

function parseNumericDefault(
	raw: string,
	asInteger: boolean,
): number | undefined {
	const trimmed = raw.trim().replace(",", ".");
	if (!trimmed) return undefined;
	const parsed = asInteger
		? Number.parseInt(trimmed, 10)
		: Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function FieldDefaultValueControl({
	primitiveTypeVariant,
	resolvedField,
	dictionaryCode,
	enumMapByCode,
	onChange,
	disabled = false,
	warningText,
}: FieldDefaultValueControlProps) {
	const currentDefault = resolvedField?.default;
	const options = resolveDefaultValueOptions(
		resolvedField,
		dictionaryCode,
		enumMapByCode,
	);
	const hasDictionary = Boolean(dictionaryCode?.trim());
	const dictionaryLoading = hasDictionary && options.length === 0;

	if (primitiveTypeVariant === "boolean") {
		const selectValue =
			currentDefault === true
				? "true"
				: currentDefault === false
					? "false"
					: "";
		return (
			<Flex flexDirection="column" gap={4}>
				<TextField
					select
					fullWidth
					size="small"
					label="Значение по умолчанию"
					disabled={disabled}
					value={selectValue}
					onChange={(e) => {
						const next = e.target.value;
						if (next === "true") onChange(true);
						else if (next === "false") onChange(false);
						else onChange(undefined);
					}}
					helperText="В новой анкете, если значение не задано явно."
				>
					<MenuItem value="">Не задано</MenuItem>
					<MenuItem value="false">Нет</MenuItem>
					<MenuItem value="true">Да</MenuItem>
				</TextField>
				{warningText ? (
					<Typography variant="caption" color="warning.main">
						{warningText}
					</Typography>
				) : null}
			</Flex>
		);
	}

	if (
		primitiveTypeVariant === "string-dictionary" ||
		(primitiveTypeVariant === "string" && options.length > 0)
	) {
		const selected =
			options.find((opt) => opt.value === String(currentDefault ?? "")) ?? null;
		return (
			<Flex flexDirection="column" gap={4}>
				<Autocomplete
					size="small"
					fullWidth
					disabled={disabled || dictionaryLoading}
					options={options}
					value={selected}
					onChange={(_, next) => onChange(next?.value)}
					getOptionLabel={(opt) => opt.label}
					isOptionEqualToValue={(a, b) => a.value === b.value}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Значение по умолчанию"
							placeholder={
								dictionaryLoading
									? "Загрузка справочника…"
									: hasDictionary
										? "Выберите значение справочника"
										: "Выберите значение"
							}
							helperText={
								hasDictionary
									? "В новой анкете подставится выбранное значение справочника."
									: "Значение из enum поля."
							}
						/>
					)}
				/>
				{warningText ? (
					<Typography variant="caption" color="warning.main">
						{warningText}
					</Typography>
				) : null}
			</Flex>
		);
	}

	if (primitiveTypeVariant === "dictionary-list") {
		const selectedValues = Array.isArray(currentDefault)
			? currentDefault.filter((item): item is string => typeof item === "string")
			: [];
		const selectedOptions = options.filter((opt) =>
			selectedValues.includes(opt.value),
		);
		return (
			<Flex flexDirection="column" gap={4}>
				<Autocomplete
					multiple
					size="small"
					fullWidth
					disabled={disabled || dictionaryLoading}
					options={options}
					value={selectedOptions}
					onChange={(_, next) => {
						const values = next.map((opt) => opt.value);
						onChange(values.length > 0 ? values : undefined);
					}}
					getOptionLabel={(opt) => opt.label}
					isOptionEqualToValue={(a, b) => a.value === b.value}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Значения по умолчанию"
							placeholder={
								dictionaryLoading
									? "Загрузка справочника…"
									: "Выберите значения справочника"
							}
							helperText="Мультивыбор из привязанного справочника."
						/>
					)}
				/>
				{warningText ? (
					<Typography variant="caption" color="warning.main">
						{warningText}
					</Typography>
				) : null}
			</Flex>
		);
	}

	if (
		primitiveTypeVariant === "integer" ||
		primitiveTypeVariant === "number"
	) {
		return (
			<Flex flexDirection="column" gap={4}>
				<TextField
					fullWidth
					size="small"
					type="number"
					label="Значение по умолчанию"
					disabled={disabled}
					value={formatDefaultForInput(currentDefault)}
					onChange={(e) => {
						const parsed = parseNumericDefault(
							e.target.value,
							primitiveTypeVariant === "integer",
						);
						onChange(parsed);
					}}
					helperText="Пусто — без default в схеме."
					slotProps={{
						htmlInput:
							primitiveTypeVariant === "integer"
								? { step: 1 }
								: { step: "any" },
					}}
				/>
				{warningText ? (
					<Typography variant="caption" color="warning.main">
						{warningText}
					</Typography>
				) : null}
			</Flex>
		);
	}

	return (
		<Flex flexDirection="column" gap={4}>
			<TextField
				fullWidth
				size="small"
				multiline={primitiveTypeVariant === "string-textarea"}
				minRows={primitiveTypeVariant === "string-textarea" ? 2 : undefined}
				label="Значение по умолчанию"
				disabled={disabled}
				value={formatDefaultForInput(currentDefault)}
				onChange={(e) => {
					const next = e.target.value;
					onChange(next.trim() ? next : undefined);
				}}
				helperText="Пусто — без default в схеме."
			/>
			{warningText ? (
				<Typography variant="caption" color="warning.main">
					{warningText}
				</Typography>
			) : null}
		</Flex>
	);
}
