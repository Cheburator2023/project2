import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import InputOutlinedIcon from "@mui/icons-material/InputOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OutputOutlinedIcon from "@mui/icons-material/OutputOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import TextFieldsOutlinedIcon from "@mui/icons-material/TextFieldsOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { Theme } from "@mui/material/styles";
import type { FieldNodeData, RuleNodeData } from "./relationsGraph";

export type PaletteSlot =
	| "info"
	| "secondary"
	| "warning"
	| "primary"
	| "success"
	| "error";

export type ChipColor =
	| "default"
	| "primary"
	| "secondary"
	| "error"
	| "info"
	| "success"
	| "warning";

type NodeVisual = {
	entityLabel: string;
	roleLabel: string;
	Icon: SvgIconComponent;
	chipColor: ChipColor;
	palette: PaletteSlot;
	handleIn: string;
	handleOut: string;
};

export const FIELD_ROLE_VISUAL: Record<FieldNodeData["role"], NodeVisual> = {
	dep: {
		entityLabel: "Поле",
		roleLabel: "Источник",
		Icon: InputOutlinedIcon,
		chipColor: "info",
		palette: "info",
		handleIn: "#6366f1",
		handleOut: "#0284c7",
	},
	target: {
		entityLabel: "Поле",
		roleLabel: "Результат",
		Icon: OutputOutlinedIcon,
		chipColor: "secondary",
		palette: "secondary",
		handleIn: "#7c3aed",
		handleOut: "#a855f7",
	},
	both: {
		entityLabel: "Поле",
		roleLabel: "Вход и выход",
		Icon: SyncAltOutlinedIcon,
		chipColor: "warning",
		palette: "warning",
		handleIn: "#7c3aed",
		handleOut: "#0284c7",
	},
};

type RuleKindVisual = {
	Icon: SvgIconComponent;
	chipColor: ChipColor;
	palette: PaletteSlot;
};

export const RULE_KIND_VISUAL: Record<string, RuleKindVisual> = {
	visibility: {
		Icon: VisibilityOutlinedIcon,
		chipColor: "info",
		palette: "info",
	},
	required: {
		Icon: CheckCircleOutlineIcon,
		chipColor: "error",
		palette: "error",
	},
	computed: {
		Icon: CalculateOutlinedIcon,
		chipColor: "primary",
		palette: "primary",
	},
	row_computed: {
		Icon: TableRowsOutlinedIcon,
		chipColor: "primary",
		palette: "primary",
	},
	validation: {
		Icon: FactCheckOutlinedIcon,
		chipColor: "error",
		palette: "error",
	},
	hint: {
		Icon: LightbulbOutlinedIcon,
		chipColor: "success",
		palette: "success",
	},
	task_trigger: {
		Icon: FlashOnOutlinedIcon,
		chipColor: "warning",
		palette: "warning",
	},
};

const DEFAULT_RULE_VISUAL: RuleKindVisual = {
	Icon: RuleOutlinedIcon,
	chipColor: "default",
	palette: "primary",
};

export function getRuleKindVisual(kind: string): RuleKindVisual {
	return RULE_KIND_VISUAL[kind] ?? DEFAULT_RULE_VISUAL;
}

export function fieldNodeThemeColor(
	role: FieldNodeData["role"],
	theme: Theme,
): string {
	return theme.palette[FIELD_ROLE_VISUAL[role].palette].main;
}

export function ruleNodeThemeColor(kind: string, theme: Theme): string {
	return theme.palette[getRuleKindVisual(kind).palette].main;
}

export function minimapNodeColor(
	node: { type?: string; data?: unknown },
	theme: Theme,
): string {
	if (node.type === "field") {
		const role = (node.data as FieldNodeData | undefined)?.role ?? "dep";
		return fieldNodeThemeColor(role, theme);
	}
	if (node.type === "rule") {
		const kind = (node.data as RuleNodeData | undefined)?.kind ?? "";
		return ruleNodeThemeColor(kind, theme);
	}
	return theme.palette.grey[500];
}

/** Иконка сущности «поле» в легенде. */
export const FIELD_ENTITY_ICON = TextFieldsOutlinedIcon;
