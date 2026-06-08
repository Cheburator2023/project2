import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import {
	V2_ARCH_COMPONENT_LABELS,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";

/** Цвета арх. компонентов для dev-подсветки (figma/miro-style). */
const ARCH_COMPONENT_COLORS: Record<V2ArchComponentType, string> = {
	modelService: "#7C3AED",
	model: "#2563EB",
	sourceSystem: "#059669",
	dataMart: "#D97706",
	dataProcess: "#0891B2",
	deployChannel: "#DB2777",
	modelControl: "#DC2626",
	typicalWork: "#65A30D",
	atypicalWork: "#CA8A04",
};

/** Подсветка включена только в dev-сборке. */
export const ARCH_DEV_OUTLINE_ENABLED = false;

/**
 * Обводит группу/массив как арх. компонент в dev-режиме: цветная пунктирная
 * рамка + бейдж-сноска с названием (как выделение слоёв в figma/miro).
 * В production-сборке рендерит детей без обёртки.
 */
export function ArchComponentDevOutline({
	archComponent,
	children,
}: {
	archComponent: V2ArchComponentType | null | undefined;
	children: ReactNode;
}) {
	if (!archComponent) {
		return <>{children}</>;
	}

	const color = ARCH_COMPONENT_COLORS[archComponent];
	const label = V2_ARCH_COMPONENT_LABELS[archComponent];

	return ARCH_DEV_OUTLINE_ENABLED ? (
		<Box
			sx={{
				position: "relative",
				border: `2px dashed ${color}`,
				borderRadius: 2,
				pt: 2.25,
				px: 1,
				pb: 1,
				my: 1,
			}}
		>
			<Box
				component="span"
				title={`Архитектурный компонент: ${label}`}
				sx={{
					position: "absolute",
					top: -11,
					left: 12,
					px: 0.75,
					py: 0.125,
					bgcolor: color,
					color: "#fff",
					borderRadius: 1,
					fontSize: 11,
					fontWeight: 700,
					lineHeight: 1.6,
					letterSpacing: 0.2,
					whiteSpace: "nowrap",
					boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
					cursor: "help",
					userSelect: "none",
				}}
			>
				◆ Арх. компонент · {label}
			</Box>
			{children}
		</Box>
	) : (
		<>{children}</>
	);
}
