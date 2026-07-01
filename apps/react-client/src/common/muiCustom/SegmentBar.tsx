import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export type SegmentBarSegment<T extends string> = {
	id: T;
	label: ReactNode;
	/** Краткая подсказка (нативный title). */
	title?: string;
	disabled?: boolean;
	"data-test-id"?: string;
};

export type SegmentBarProps<T extends string> = {
	segments: readonly SegmentBarSegment<T>[];
	value: T;
	onChange: (value: T) => void;
	/** Только активный сегмент кликабелен (остальные disabled). */
	readOnly?: boolean;
	"data-test-id"?: string;
};

export function SegmentBar<T extends string>({
	segments,
	value,
	onChange,
	readOnly = false,
	"data-test-id": dataTestId,
}: SegmentBarProps<T>) {
	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				display: "inline-flex",
				p: "2px",
				gap: "2px",
				borderRadius: "9px",
				border: "1px solid #e6e8ee",
				bgcolor: "#f1f3f7",
			}}
		>
			{segments.map((segment) => {
				const selected = value === segment.id;
				const disabled =
					segment.disabled ?? (readOnly ? !selected : false);
				return (
					<Box
						key={segment.id}
						component="button"
						type="button"
						title={segment.title}
						data-test-id={segment["data-test-id"]}
						disabled={disabled}
						onClick={() => {
							if (disabled || selected) return;
							onChange(segment.id);
						}}
						sx={{
							border: "none",
							cursor: disabled ? "default" : "pointer",
							fontFamily: "inherit",
							padding: "6px 13px",
							borderRadius: "7px",
							fontSize: "12.5px",
							fontWeight: 600,
							bgcolor: selected ? "#1c2333" : "transparent",
							color: selected ? "#fff" : disabled ? "#aab1c0" : "#5b6577",
							opacity: disabled ? 0.6 : 1,
						}}
					>
						{segment.label}
					</Box>
				);
			})}
		</Box>
	);
}
