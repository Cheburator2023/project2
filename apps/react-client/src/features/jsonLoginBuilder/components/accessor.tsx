import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";

interface Props {
	value?: string;
	data?: Record<string, unknown> | unknown[];
	onChange: (value: string) => void;
}

function getIterator(data: unknown): string[] | null {
	if (Array.isArray(data)) {
		const head = data[0];
		if (head && typeof head === "object") return Object.keys(head);
		return null;
	}
	if (data !== null && typeof data === "object") {
		return Object.keys(data as Record<string, unknown>);
	}
	return null;
}

export function Accessor({ value = "", data = {}, onChange }: Props) {
	const splitValue = value.split(".");

	const renderSelector = (current: unknown, level: number): ReactNode => {
		const levelValue = splitValue[level] ?? "";
		const iterator = getIterator(current);
		if (!iterator) return null;

		const handleChange = (newText: string) => {
			const next = splitValue.slice(0, level);
			next[level] = newText;
			onChange(next.join("."));
		};

		const nextNode = Array.isArray(current)
			? (current[0] as Record<string, unknown> | undefined)?.[levelValue]
			: (current as Record<string, unknown>)[levelValue];

		return (
			<span data-rjl-accessor-level data-rjl-accessor-level-index={level}>
				<TextField
					select
					size="small"
					value={levelValue}
					onChange={(e) => handleChange(e.target.value)}
					slotProps={{
						input: {
							"data-rjl-accessor-input": "",
						},
					}}
					SelectProps={{
						MenuProps: {
							slotProps: {
								paper: {
									"data-rjl-accessor-popup": "",
								},
							},
						},
					}}
				>
					{iterator.map((item) => (
						<MenuItem key={item} value={item}>
							{item}
						</MenuItem>
					))}
				</TextField>
				{renderSelector(nextNode, level + 1)}
			</span>
		);
	};

	return <span data-rjl-accessor>{renderSelector(data, 0)}</span>;
}

export default Accessor;
