import { useMemo } from "react";
import {
	FIELD_TYPES,
	OPERATORS,
	type FieldType,
	type JsonLogicValue,
	type Operator,
} from "../operators";
import Accessor from "./accessor";
import HigherOrder from "./higher-order";
import Input from "./input";
import SelectOperator from "./select-operator";

type DataObject = Record<string, unknown> | unknown[];

interface Props {
	parent: string;
	value?: JsonLogicValue | undefined;
	data?: DataObject | undefined;
	onChange: (value: JsonLogicValue) => void;
}

interface DerivedState {
	field: string;
	selectedOperator: Operator | undefined;
	fields: FieldType[];
}

function isPlainObject(value: unknown): value is Record<string, JsonLogicValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVariadicOperator(op: Operator): boolean {
	return op.fieldCount.max > op.fieldCount.min || op.fieldCount.max > op.fields.length;
}

function initialChildArray(op: Operator): JsonLogicValue[] {
	const count = Math.max(op.fieldCount.min, op.fields.length);
	return Array.from({ length: count }, () => "");
}

function resolveFieldSlots(
	selectedOperator: Operator,
	value: JsonLogicValue | undefined,
	field: string,
): FieldType[] {
	const base = [...selectedOperator.fields];

	if (!isPlainObject(value)) {
		return base;
	}

	const slot = value[field];
	if (!Array.isArray(slot)) {
		return base;
	}

	if (!isVariadicOperator(selectedOperator)) {
		return base;
	}

	const { min, max } = selectedOperator.fieldCount;
	const effectiveLength =
		slot.length === 0 ? Math.max(min, base.length) : Math.max(min, slot.length);
	const count = Math.min(max, effectiveLength);

	return Array.from({ length: count }, (_, i) => base[i] ?? FIELD_TYPES.ANY);
}

function deriveState(value: JsonLogicValue | undefined): DerivedState {
	let field = "value";

	if (isPlainObject(value)) {
		const [first] = Object.keys(value);
		if (first === undefined) {
			field = "";
		} else {
			const matches = OPERATORS.some(
				(op) => op.signature === first || op.label === first,
			);
			field = matches ? first : "value";
		}
	}

	const selectedOperator = OPERATORS.find(
		(op) => op.signature === field || op.label === field,
	);

	const fields = selectedOperator
		? resolveFieldSlots(selectedOperator, value, field)
		: [];

	return { field, selectedOperator, fields };
}

export function Any({ parent, value, data = {}, onChange }: Props) {
	const { field, selectedOperator, fields } = useMemo(
		() => deriveState(value),
		[value],
	);

	const availableOperators = useMemo(() => {
		let operators = OPERATORS.filter((op) => !op.notAvailableUnder.includes(parent));
		if (Object.keys(data).length === 0) {
			operators = operators.filter((op) => op.signature !== "var");
		}
		return operators;
	}, [parent, data]);

	const onFieldChange = (nextField: string) => {
		if (nextField === "value") {
			onChange("");
			return;
		}
		const op = OPERATORS.find((item) => item.signature === nextField);
		onChange({
			[nextField]: op ? initialChildArray(op) : [],
		});
	};

	const updateChildArray = (update: (arr: JsonLogicValue[]) => JsonLogicValue[]) => {
		const current = isPlainObject(value) ? value : {};
		const slot = current[field];
		const arr = Array.isArray(slot) ? [...slot] : [];
		onChange({ ...current, [field]: update(arr) });
	};

	const onChildValueChange = (childValue: JsonLogicValue, index: number) => {
		if (field === "value") {
			onChange(childValue);
			return;
		}
		updateChildArray((arr) => {
			const next = [...arr];
			while (next.length <= index) {
				next.push("");
			}
			next[index] = childValue;
			return next;
		});
	};

	const addField = () => {
		updateChildArray((arr) => [...arr, ""]);
	};

	const removeField = (index: number) => {
		updateChildArray((arr) => arr.filter((_, i) => i !== index));
	};

	const renderChild = (childField: FieldType, index: number) => {
		const isRemovable = selectedOperator
			? fields.length > selectedOperator.fieldCount.min
			: false;

		let childValue: JsonLogicValue = "";
		if (field === "value") {
			childValue = value ?? "";
		} else if (isPlainObject(value)) {
			const arr = value[field];
			if (Array.isArray(arr)) childValue = arr[index] ?? "";
		}

		const childOnChange = (val: JsonLogicValue) => onChildValueChange(val, index);

		let element: React.ReactNode;
		switch (childField) {
			case "any":
				element = (
					<Any parent={field} value={childValue} data={data} onChange={childOnChange} />
				);
				break;
			case "input":
				element = (
					<Input
						value={
							typeof childValue === "string" || typeof childValue === "number"
								? childValue
								: ""
						}
						onChange={childOnChange}
					/>
				);
				break;
			case "accessor":
				element = (
					<Accessor
						value={typeof childValue === "string" ? childValue : ""}
						data={data}
						onChange={childOnChange}
					/>
				);
				break;
			case "higher-order":
				element = (
					<HigherOrder
						parent={field}
						value={childValue}
						data={data}
						onChange={childOnChange}
					/>
				);
				break;
		}

		return (
			<span data-rjl-field key={`${field}.${index}`}>
				{isRemovable && (
					<button
						type="button"
						aria-label={`Удалить поле ${index + 1}`}
						data-rjl-remove
						onClick={() => removeField(index)}
					>
						×
					</button>
				)}
				{element}
			</span>
		);
	};

	const canAddMoreChildren = selectedOperator
		? fields.length < selectedOperator.fieldCount.max
		: false;

	return (
		<span data-rjl-any>
			<SelectOperator value={field} options={availableOperators} onChange={onFieldChange} />

			{canAddMoreChildren && (
				<button
					type="button"
					aria-label="Добавить поле"
					data-rjl-add
					onClick={addField}
				>
					+
				</button>
			)}

			{selectedOperator && <span data-rjl-children>{fields.map(renderChild)}</span>}
		</span>
	);
}

export default Any;
