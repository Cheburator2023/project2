import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkParameterDto,
	V2TypicalWorkRuleDto,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { archComponentShortLabel } from "./typicalWorksUi";

type TypicalWorkTriggersSectionProps = {
	rules: V2TypicalWorkRuleDto[];
	triggerStatus: V2WorkTriggerStatus;
	archComponentType: string;
	paramOptions: V2TypicalWorkParameterDto[];
	streamExecutor: string;
	onChange: (rules: V2TypicalWorkRuleDto[]) => void;
};

function triggerBanner(status: V2WorkTriggerStatus, ruleCount: number) {
	switch (status) {
		case "appears":
			return {
				bg: "#e7f6ec",
				border: "#cfe9d8",
				iconBg: "#1f8a4d",
				icon: "✓",
				title: `Работа появляется в анкете (${ruleCount} ${ruleCount === 1 ? "условие" : "условия"})`,
				sub: "все условия выполнены",
				fg: "#1f8a4d",
			};
		case "invalid":
			return {
				bg: "#fdecec",
				border: "#f5c6c6",
				iconBg: "#c62828",
				icon: "!",
				title: "Условия заданы некорректно",
				sub: "проверьте параметры-триггеры",
				fg: "#c62828",
			};
		default:
			return {
				bg: "#fdf3e0",
				border: "#f0e3c8",
				iconBg: "#b5791f",
				icon: "•",
				title: "Триггеры не заданы",
				sub: "работа всегда появляется в анкете",
				fg: "#b5791f",
			};
	}
}

export function TypicalWorkTriggersSection({
	rules,
	triggerStatus,
	archComponentType,
	paramOptions,
	streamExecutor,
	onChange,
}: TypicalWorkTriggersSectionProps) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const banner = triggerBanner(triggerStatus, rules.length);

	const usedParamCodes = useMemo(
		() => new Set(rules.map((r) => r.paramCode)),
		[rules],
	);

	const pickerItems = paramOptions.filter((p) => !usedParamCodes.has(p.code));

	const grouped = useMemo(() => {
		const map = new Map<string, V2TypicalWorkRuleDto[]>();
		for (const rule of rules) {
			const list = map.get(rule.paramCode) ?? [];
			list.push(rule);
			map.set(rule.paramCode, list);
		}
		return [...map.entries()];
	}, [rules]);

	const toggleValue = (
		param: V2TypicalWorkParameterDto,
		valueCode: string,
		valueLabel: string,
		selected: boolean,
	) => {
		if (selected) {
			onChange(
				rules.filter(
					(r) => !(r.paramCode === param.code && r.valueCode === valueCode),
				),
			);
			return;
		}
		const withoutParam = rules.filter((r) => r.paramCode !== param.code);
		onChange([
			...withoutParam,
			{
				id: `new-${Date.now()}-${valueCode}`,
				streamExecutor,
				paramCode: param.code,
				paramName: param.name,
				operator: "=",
				valueCode,
				valueLabel,
			},
		]);
	};

	const removeParam = (paramCode: string) => {
		onChange(rules.filter((r) => r.paramCode !== paramCode));
	};

	const addParam = (param: V2TypicalWorkParameterDto) => {
		const firstValue = param.values[0];
		onChange([
			...rules,
			{
				id: `new-${Date.now()}`,
				streamExecutor,
				paramCode: param.code,
				paramName: param.name,
				operator: "=",
				valueCode: firstValue?.code ?? null,
				valueLabel: firstValue?.label ?? null,
			},
		]);
		setPickerOpen(false);
	};

	return (
		<Box
			sx={{
				bgcolor: "#fff",
				border: "1px solid #e6e8ee",
				borderRadius: "12px",
				p: "15px 17px",
				mb: 1.5,
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.1,
					mb: 1.4,
					flexWrap: "wrap",
				}}
			>
				<Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#1d2435" }}>
					Условия появления работы
				</Typography>
				<Button
					size="small"
					onClick={() => setPickerOpen((v) => !v)}
					sx={{
						ml: "auto",
						textTransform: "none",
						height: 28,
						border: "1px solid #dfe2ea",
						borderRadius: "7px",
						color: "#384152",
					}}
				>
					+ Параметр-триггер
				</Button>
			</Box>

			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.4,
					borderRadius: "10px",
					p: "11px 13px",
					mb: 1.5,
					bgcolor: banner.bg,
					border: `1px solid ${banner.border}`,
				}}
			>
				<Box
					sx={{
						width: 26,
						height: 26,
						borderRadius: "50%",
						bgcolor: banner.iconBg,
						color: "#fff",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 14,
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{banner.icon}
				</Box>
				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 700, color: banner.fg }}>
						{banner.title}
					</Typography>
					<Typography sx={{ fontSize: 11.5, color: "#6b7484", mt: 0.15 }}>
						{banner.sub}
					</Typography>
				</Box>
			</Box>

			{pickerOpen ? (
				<Box
					sx={{
						border: "1px solid #e1e9f6",
						bgcolor: "#f6f9fe",
						borderRadius: "10px",
						p: "10px 11px",
						mb: 1.5,
					}}
				>
					<Typography
						sx={{
							fontSize: 11,
							fontWeight: 700,
							color: "#2f6bd8",
							textTransform: "uppercase",
							letterSpacing: "0.04em",
							mb: 1,
						}}
					>
						Параметр компонента «{archComponentShortLabel(archComponentType)}»
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
						{pickerItems.length === 0 ? (
							<Typography sx={{ fontSize: 12, color: "#8a93a3" }}>
								Все доступные параметры уже добавлены.
							</Typography>
						) : (
							pickerItems.map((param) => (
								<Box
									key={param.code}
									component="button"
									type="button"
									onClick={() => addParam(param)}
									sx={{
										border: "1px solid #dfe2ea",
										bgcolor: "#fff",
										borderRadius: "8px",
										px: 1.25,
										py: 0.75,
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 12,
										color: "#3a4252",
									}}
								>
									{param.name}
								</Box>
							))
						)}
					</Box>
				</Box>
			) : null}

			{grouped.length > 0 ? (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
					{grouped.map(([paramCode, paramRules]) => {
						const param =
							paramOptions.find((p) => p.code === paramCode) ??
							paramOptions.find((p) => p.name === paramRules[0]?.paramName);
						const selectedCodes = new Set(
							paramRules.map((r) => r.valueCode).filter(Boolean),
						);
						return (
							<Box
								key={paramCode}
								sx={{
									border: "1px solid #f0e3d2",
									bgcolor: "#fdf8f1",
									borderRadius: "11px",
									p: "11px 12px",
								}}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1,
										mb: 1.1,
									}}
								>
									<Typography
										sx={{
											flex: 1,
											fontSize: 12.5,
											fontWeight: 700,
											color: "#1d2435",
											lineHeight: 1.25,
										}}
									>
										{param?.name ?? paramRules[0]?.paramName ?? paramCode}
									</Typography>
									<IconButton
										size="small"
										aria-label="Удалить триггер"
										onClick={() => removeParam(paramCode)}
										sx={{ color: "#c2554c" }}
									>
										<DeleteOutlineIcon fontSize="small" />
									</IconButton>
								</Box>
								<Typography sx={{ fontSize: 11, color: "#9a7b52", mb: 0.9 }}>
									Работа появляется, если ответ — одно из выбранных значений:
								</Typography>
								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
									{(param?.values ?? []).map((value) => {
										const selected = selectedCodes.has(value.code);
										return (
											<Box
												key={value.code}
												component="button"
												type="button"
												onClick={() => {
													if (!param) return;
													toggleValue(
														param,
														value.code,
														value.label,
														selected,
													);
												}}
												sx={{
													display: "inline-flex",
													alignItems: "center",
													gap: 0.75,
													height: 30,
													px: 1.4,
													borderRadius: "8px",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 12,
													fontWeight: selected ? 700 : 500,
													bgcolor: selected ? "#fff7ed" : "#fff",
													color: selected ? "#9a5b13" : "#5b6577",
													border: `1px solid ${selected ? "#e8c9a0" : "#dfe2ea"}`,
												}}
											>
												<span>{selected ? "[v]" : "[ ]"}</span>
												{value.label}
											</Box>
										);
									})}
								</Box>
							</Box>
						);
					})}
					<Typography sx={{ fontSize: 11, color: "#8a93a3", px: 0.25 }}>
						Несколько параметров-триггеров объединяются по <b>И</b> — работа
						появляется, когда выполнены все.
					</Typography>
				</Box>
			) : null}
		</Box>
	);
}
