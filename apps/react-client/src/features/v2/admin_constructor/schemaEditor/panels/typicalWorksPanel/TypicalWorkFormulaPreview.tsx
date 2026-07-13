import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type {
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkParameterDto,
	V2TypicalWorkRuleDto,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";
import { parseParamNameSourceKeys } from "@smart-anketa/api-contract";
import { usePreviewV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { triggerStatusLabel } from "./typicalWorksUi";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const PREVIEW_DEBOUNCE_MS = 450;

export type TypicalWorkFormulaPreviewProps = {
	workId: string;
	streamExecutor: string;
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	rules: V2TypicalWorkRuleDto[];
	paramCatalog: V2TypicalWorkParameterDto[];
	/** Сводка из редактора (до ответа API / между автосохранениями). */
	localFormulaText?: string;
	/** Увеличивается после успешного автосохранения — перезапускает preview API. */
	refreshToken?: number;
	isSaving?: boolean;
};

function catalogValuesForParam(
	paramCode: string,
	catalog: V2TypicalWorkParameterDto[],
): Array<{ code: string; label: string }> {
	return catalog.find((p) => p.code === paramCode)?.values ?? [];
}

function isBooleanLikeAnyOf(
	group: V2TypicalWorkLaborParamGroupDto,
	catalog: V2TypicalWorkParameterDto[],
): boolean {
	const codes = new Set([
		...(group.anyOf?.valueCodes ?? []),
		...catalogValuesForParam(group.paramCode, catalog).map((v) => v.code),
	]);
	return codes.has("true") || codes.has("false");
}

function defaultOffCodeForAnyOf(
	group: V2TypicalWorkLaborParamGroupDto,
	catalog: V2TypicalWorkParameterDto[],
): string | undefined {
	const values = catalogValuesForParam(group.paramCode, catalog);
	const fromCatalog = values.find(
		(v) => v.code === "false" || v.label.trim().toLowerCase() === "нет",
	)?.code;
	if (fromCatalog) return fromCatalog;
	const fromAnyOf = group.anyOf?.valueCodes.find((code) => code === "false");
	return fromAnyOf;
}

export function buildDefaultPreviewAnswers(
	laborParams: V2TypicalWorkLaborParamGroupDto[],
	rules: V2TypicalWorkRuleDto[],
	catalog: V2TypicalWorkParameterDto[],
): Record<string, string> {
	const answers: Record<string, string> = {};

	for (const group of laborParams) {
		if (group.kind === "any_of" && group.anyOf?.valueCodes.length) {
			if (isBooleanLikeAnyOf(group, catalog)) {
				const offCode = defaultOffCodeForAnyOf(group, catalog);
				if (offCode) answers[group.paramCode] = offCode;
			} else {
				answers[group.paramCode] = group.anyOf.valueCodes[0] ?? "";
			}
			continue;
		}
		const fromCoeff = group.coefficients.find((c) => c.valueCode)?.valueCode;
		if (fromCoeff) {
			answers[group.paramCode] = fromCoeff;
			continue;
		}
		const first = catalogValuesForParam(group.paramCode, catalog)[0];
		if (first) answers[group.paramCode] = first.code;
	}

	for (const rule of rules) {
		const value =
			rule.valueCode ??
			rule.valueLabel ??
			rule.values?.[0]?.code ??
			rule.values?.[0]?.label ??
			"";
		if (!value) continue;

		const keys = new Set<string>([rule.paramCode]);
		for (const key of parseParamNameSourceKeys(rule.paramName).sourceKeys) {
			keys.add(key);
		}
		for (const key of keys) {
			if (!answers[key]) answers[key] = value;
		}
	}

	return answers;
}

function previewParamLabels(
	laborParams: V2TypicalWorkLaborParamGroupDto[],
	rules: V2TypicalWorkRuleDto[],
	catalog: V2TypicalWorkParameterDto[],
): Array<{ code: string; name: string; values: Array<{ code: string; label: string }> }> {
	const codes = new Set<string>();
	for (const g of laborParams) codes.add(g.paramCode);
	for (const r of rules) codes.add(r.paramCode);

	return [...codes].map((code) => {
		const fromLabor = laborParams.find((g) => g.paramCode === code);
		const fromRule = rules.find((r) => r.paramCode === code);
		const fromCatalog = catalog.find((p) => p.code === code);
		const name =
			fromLabor?.paramName ??
			fromRule?.paramName ??
			fromCatalog?.name ??
			code;

		if (fromLabor?.kind === "any_of" && fromLabor.anyOf) {
			return {
				code,
				name,
				values: fromLabor.anyOf.valueCodes.map((c, i) => ({
					code: c,
					label: fromLabor.anyOf?.valueLabels[i] ?? c,
				})),
			};
		}

		const coeffValues = fromLabor?.coefficients
			.filter((c) => c.valueCode)
			.map((c) => ({ code: c.valueCode!, label: c.valueLabel ?? c.valueCode! }));
		if (coeffValues?.length) {
			return { code, name, values: coeffValues };
		}

		return {
			code,
			name,
			values: catalogValuesForParam(code, catalog).map((v) => ({
				code: v.code,
				label: v.label,
			})),
		};
	});
}

function triggerBannerColor(status: V2WorkTriggerStatus | undefined): string {
	switch (status) {
		case "appears":
			return "#1f8a4d";
		case "invalid":
			return "#c62828";
		case "hidden":
			return "#5b6577";
		default:
			return "#b5791f";
	}
}

function defaultFormulaFallback(
	localFormulaText: string | undefined,
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): string {
	const local = localFormulaText?.trim();
	if (local) return local;
	return laborParams.length === 0 ? "H" : "—";
}

export function TypicalWorkFormulaPreview({
	workId,
	streamExecutor,
	laborParams,
	rules,
	paramCatalog,
	localFormulaText,
	refreshToken = 0,
	isSaving = false,
}: TypicalWorkFormulaPreviewProps) {
	const preview = usePreviewV2TypicalWork();
	const paramRows = useMemo(
		() => previewParamLabels(laborParams, rules, paramCatalog),
		[laborParams, paramCatalog, rules],
	);

	const [answers, setAnswers] = useState<Record<string, string>>(() =>
		buildDefaultPreviewAnswers(laborParams, rules, paramCatalog),
	);

	useEffect(() => {
		setAnswers(buildDefaultPreviewAnswers(laborParams, rules, paramCatalog));
	}, [workId, streamExecutor, laborParams, rules, paramCatalog]);

	useEffect(() => {
		if (!workId || !streamExecutor.trim()) return;
		const timer = setTimeout(() => {
			preview.mutate({
				workId,
				dto: {
					streamExecutor,
					answers,
				},
			});
		}, PREVIEW_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [workId, streamExecutor, answers, refreshToken, preview.mutate]);

	const apiSymbolic = preview.data?.formulaSymbolic?.trim();
	const symbolic =
		apiSymbolic || defaultFormulaFallback(localFormulaText, laborParams);
	const showLocalHint =
		Boolean(localFormulaText?.trim()) &&
		Boolean(apiSymbolic) &&
		localFormulaText!.trim() !== apiSymbolic &&
		(isSaving || preview.isPending);

	const result = preview.data?.result;
	const previewError =
		preview.data?.error ??
		(preview.error ? apiErrorMessage(preview.error) : null);
	const triggerStatus = preview.data?.triggerStatus;

	return (
		<PaperLike data-test-id={TID.workFormulaPreview}>
			<Typography variant="subtitle2" fontWeight={700} gutterBottom>
				Превью калькуляции
			</Typography>
			<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 1.25 }}>
				Формула в общем виде (без числовых коэффициентов) — с сервера после
				автосохранения; черновик редактора показывается, пока идёт сохранение или
				запрос. Ответы ниже влияют на итог и статус триггеров.
			</Typography>

			{paramRows.length > 0 ? (
				<Flex flexDirection="column" gap={10} sx={{ mb: 1.5 }}>
					{paramRows.map((param) => {
						if (param.values.length === 0) return null;
						const laborGroup = laborParams.find((g) => g.paramCode === param.code);
						const booleanLike =
							laborGroup?.kind === "any_of" &&
							isBooleanLikeAnyOf(laborGroup, paramCatalog);
						const defaultCode = booleanLike
							? (defaultOffCodeForAnyOf(laborGroup!, paramCatalog) ??
								param.values.find((v) => v.code === "false")?.code ??
								"")
							: (param.values[0]?.code ?? "");
						const current = answers[param.code] ?? defaultCode;
						return (
							<Box key={param.code}>
								<Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
									{param.name}
								</Typography>
								<Flex wrap="wrap" gap={6}>
									{param.values.map((value) => {
										const on = value.code === current;
										return (
											<Box
												key={value.code}
												component="button"
												type="button"
												onClick={() =>
													setAnswers((prev) => ({
														...prev,
														[param.code]: value.code,
													}))
												}
												sx={{
													height: 26,
													px: 1.1,
													borderRadius: "7px",
													border: `1px solid ${on ? "#2f6bd8" : "#dfe2ea"}`,
													bgcolor: on ? "#2f6bd8" : "#fff",
													color: on ? "#fff" : "#5b6577",
													fontSize: 11.5,
													fontWeight: on ? 700 : 500,
													cursor: "pointer",
													fontFamily: "inherit",
												}}
											>
												{value.label}
											</Box>
										);
									})}
								</Flex>
							</Box>
						);
					})}
				</Flex>
			) : null}

			<Card
				padding="10px 14px"
				sx={{
					bgcolor: "#1e293b",
					color: "#f8fafc",
					borderRadius: "10px",
					border: "none",
					mb: 1,
				}}
			>
				<Flex justifyContent="space-between" alignItems="flex-start" gap={12}>
					<Flex flexDirection="column" gap={4} minWidth="0">
						<Typography variant="caption" sx={{ color: "#94a3b8" }}>
							Формула (общий вид)
							{showLocalHint ? " · черновик" : apiSymbolic ? " · сохранено" : ""}
						</Typography>
						<Typography
							variant="body1"
							fontWeight={700}
							data-test-id={TID.workFormulaPreviewSymbolic}
							sx={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-word" }}
						>
							{preview.isPending && !preview.data && !localFormulaText
								? "…"
								: symbolic}
						</Typography>
					</Flex>
					{preview.isPending || isSaving ? (
						<CircularProgress size={18} sx={{ color: "#94a3b8", flexShrink: 0 }} />
					) : null}
				</Flex>
			</Card>

			<Flex alignItems="center" gap={12} wrap="wrap">
				<Typography sx={{ fontSize: 13 }} data-test-id={TID.workFormulaPreviewResult}>
					<strong>Итог:</strong>{" "}
					{result != null ? `${result} ч/д` : previewError ? "—" : "…"}
				</Typography>
				{triggerStatus ? (
					<Typography
						sx={{ fontSize: 12, color: triggerBannerColor(triggerStatus) }}
					>
						{triggerStatusLabel(triggerStatus)}
					</Typography>
				) : null}
			</Flex>
			{previewError ? (
				<Typography sx={{ fontSize: 12, color: "#c62828", mt: 0.75 }}>
					{previewError}
				</Typography>
			) : null}
		</PaperLike>
	);
}

function PaperLike({
	children,
	"data-test-id": dataTestId,
}: {
	children: ReactNode;
	"data-test-id"?: string;
}) {
	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				border: "1px solid #e6e8ee",
				borderRadius: "12px",
				p: 1.5,
				mt: 1.5,
				bgcolor: "#fff",
			}}
		>
			{children}
		</Box>
	);
}
