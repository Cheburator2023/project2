import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useV2TypicalWorkCard } from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { WorkFormulaEditor } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/WorkFormulaEditor";
import { pathForAdminV2TypicalWork } from "@react-client/routing/common/pathHelpers";
import type {
	V2FormulaRegistryItemDto,
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
} from "@smart-anketa/api-contract";
import {
	parseWorkFormulaText,
	resolveActiveNormOnDate,
	normalizeWorkFormulaLaborParamTokens,
} from "@smart-anketa/api-contract";
import { formatFormulaRegistryParamLabel } from "@smart-anketa/api-contract";
import { Link as RouterLink } from "react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

type V2FormulaRegistryDetailProps = {
	item: V2FormulaRegistryItemDto;
	allItems: V2FormulaRegistryItemDto[];
	onSelectItem: (id: string) => void;
	layout?: "workspace";
};

function buildRegistryFormulaFallback(
	item: V2FormulaRegistryItemDto,
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): V2TypicalWorkFormulaDto {
	const parsed = parseWorkFormulaText(item.formulaText || "N");
	const paramRefByCode = new Map(
		item.paramRefs.map((ref) => [ref.paramCode, ref]),
	);
	const workRefByAssignment = new Map(
		item.workRefs.map((ref) => [ref.assignmentId, ref]),
	);
	const normalized = normalizeWorkFormulaLaborParamTokens(
		parsed.tokens,
		laborParams,
	);
	const tokens = normalized.map((token) => {
		if (token.kind === "param_coeff" || token.kind === "param_anyof") {
			const ref = paramRefByCode.get(token.paramCode);
			return {
				...token,
				kind: ref?.kind ?? token.kind,
				paramName: ref?.paramName ?? token.paramName,
				invalid: ref?.invalid ?? token.invalid,
			};
		}
		if (token.kind === "work_ref") {
			const ref = workRefByAssignment.get(token.assignmentId);
			return {
				...token,
				workName: ref?.workName ?? token.workName,
				invalid: ref?.invalid ?? token.invalid,
			};
		}
		return token;
	});
	return { text: item.formulaText || "N", tokens };
}

function buildRegistryLaborParamsFallback(
	item: V2FormulaRegistryItemDto,
): V2TypicalWorkLaborParamGroupDto[] {
	return item.paramRefs.map((ref) => ({
		paramCode: ref.paramCode,
		paramName: ref.paramName ?? ref.paramCode,
		kind: ref.kind === "param_anyof" ? ("any_of" as const) : ("by_value" as const),
		coefficients: [],
		anyOf:
			ref.kind === "param_anyof"
				? {
						valueCodes: ["__registry_preview__"],
						valueLabels: [ref.paramName?.trim() || ref.paramCode],
						coeffOn: 1,
						coeffOff: 0,
					}
				: null,
	}));
}

function buildRegistryRoundingFallback(
	item: V2FormulaRegistryItemDto,
): V2TypicalWorkRoundingDto {
	return { mode: item.roundingMode, step: 0.1 };
}

function findInboundRefs(
	item: V2FormulaRegistryItemDto,
	allItems: V2FormulaRegistryItemDto[],
): V2FormulaRegistryItemDto[] {
	return allItems.filter((other) => {
		if (other.id === item.id) return false;
		if (item.assignmentId) {
			return other.workRefs.some(
				(ref) => ref.assignmentId === item.assignmentId,
			);
		}
		return other.workRefs.some((ref) => ref.workId === item.workId);
	});
}

function DetailSection({
	title,
	emptyLabel,
	hasContent,
	children,
}: {
	title: string;
	emptyLabel: string;
	hasContent: boolean;
	children: ReactNode;
}) {
	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="subtitle2" fontWeight={700}>
				{title}
			</Typography>
			{hasContent ? (
				children
			) : (
				<Typography variant="body2" color="text.secondary">
					{emptyLabel}
				</Typography>
			)}
		</Flex>
	);
}

export function V2FormulaRegistryDetail({
	item,
	allItems,
	onSelectItem,
	layout = "workspace",
}: V2FormulaRegistryDetailProps) {
	const {
		data: card,
		isLoading: cardLoading,
		error: cardError,
	} = useV2TypicalWorkCard(item.workId, item.streamExecutor, item.templateVersionId);

	const inboundRefs = useMemo(
		() => findInboundRefs(item, allItems),
		[item, allItems],
	);

	const laborParams = card?.laborParams ?? buildRegistryLaborParamsFallback(item);
	const formula = card?.formula ?? buildRegistryFormulaFallback(item, laborParams);
	const rounding = card?.rounding ?? buildRegistryRoundingFallback(item);
	const normValue = card
		? resolveActiveNormOnDate(
				card.norms,
				item.streamExecutor,
				new Date().toISOString().slice(0, 10),
			)
		: null;
	const resolveParamName = useMemo(
		() => (paramCode: string, paramName?: string | null) => {
			const fromCard = laborParams.find((group) => group.paramCode === paramCode)
				?.paramName;
			const fromRegistry = item.paramRefs.find(
				(ref) => ref.paramCode === paramCode,
			)?.paramName;
			return (
				fromCard?.trim() ||
				fromRegistry?.trim() ||
				paramName?.trim() ||
				paramCode
			);
		},
		[item.paramRefs, laborParams],
	);

	return (
		<Card
			height="100%"
			width="100%"
			padding={layout === "workspace" ? "16px" : "12px"}
			sx={{ overflow: "auto" }}
		>
			<Flex flexDirection="column" gap={16}>
				<Flex flexDirection="column" gap={4}>
					<Typography variant="overline" color="text.secondary">
						Формула расчёта
					</Typography>
					<Typography variant="h6" fontWeight={700}>
						{item.workName}
					</Typography>
				</Flex>

				<Divider />

				<Flex flexDirection="column" gap={8}>
					<Typography variant="subtitle2" fontWeight={700}>
						Контекст
					</Typography>
					<Flex flexDirection="column" gap={1.25}>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Схема
							</Typography>
							<Typography variant="body2" textAlign="right">
								{item.templateName}
							</Typography>
						</Flex>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Версия
							</Typography>
							<Typography variant="body2" textAlign="right">
								v{item.versionNumber} ({item.versionStatus})
							</Typography>
						</Flex>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Стрим
							</Typography>
							<Typography variant="body2" textAlign="right">
								{item.streamExecutor}
							</Typography>
						</Flex>
					</Flex>
				</Flex>

				<Divider />

				<Card padding="12px">
					{cardLoading ? (
						<Flex justifyContent="center" alignItems="center" padding="24px">
							<CircularProgress size={24} />
						</Flex>
					) : cardError && !card ? (
						<>
							<Alert severity="warning" sx={{ mb: 1.5 }}>
								Не удалось загрузить карточку работы:{" "}
								{apiErrorMessage(cardError)}. Показан упрощённый вид формулы.
							</Alert>
							<WorkFormulaEditor
								formula={formula}
								rounding={rounding}
								laborParams={laborParams}
								normValue={normValue}
								currentAssignmentId={item.assignmentId}
								onFormulaChange={() => undefined}
								onRoundingChange={() => undefined}
								resolveParamName={resolveParamName}
								readOnly
							/>
						</>
					) : (
						<WorkFormulaEditor
							formula={formula}
							rounding={rounding}
							laborParams={laborParams}
							normValue={normValue}
							currentAssignmentId={item.assignmentId}
							onFormulaChange={() => undefined}
							onRoundingChange={() => undefined}
							resolveParamName={resolveParamName}
							readOnly
						/>
					)}
				</Card>

				<Divider />

				<DetailSection
					title="Параметры в формуле"
					emptyLabel="Параметры не используются — только норма или константы."
					hasContent={item.paramRefs.length > 0}
				>
					<Flex flexDirection="column" gap={8}>
						{item.paramRefs.map((ref) => (
							<Flex
								key={`${ref.kind}:${ref.paramCode}`}
								alignItems="center"
								gap={8}
								wrap="wrap"
							>
								<Chip
									size="small"
									label={ref.kind === "param_anyof" ? "any-of" : "коэф."}
									variant="outlined"
								/>
								<Typography variant="body2" fontWeight={600}>
									{formatFormulaRegistryParamLabel(ref.paramCode, ref.paramName)}
								</Typography>
								{ref.invalid ? (
									<Chip size="small" color="warning" label="не найден" />
								) : null}
							</Flex>
						))}
					</Flex>
				</DetailSection>

				<Divider />

				<DetailSection
					title="Ссылки на другие работы"
					emptyLabel="Транзитивных ссылок на другие работы нет."
					hasContent={item.workRefs.length > 0}
				>
					<Flex flexDirection="column" gap={8}>
						{item.workRefs.map((ref) => (
							<Flex
								key={ref.assignmentId}
								alignItems="center"
								gap={8}
								wrap="wrap"
							>
								{ref.workId ? (
									<Button
										component={RouterLink}
										to={pathForAdminV2TypicalWork(ref.workId)}
										size="small"
										variant="text"
										sx={{ minWidth: 0, px: 0.5 }}
									>
										{ref.workName?.trim() || ref.workId}
									</Button>
								) : (
									<Typography variant="body2">
										{ref.workName?.trim() || ref.assignmentId}
									</Typography>
								)}
								{ref.invalid ? (
									<Chip size="small" color="warning" label="назначение не найдено" />
								) : null}
							</Flex>
						))}
					</Flex>
				</DetailSection>

				<Divider />

				<DetailSection
					title="Используется в формулах других работ"
					emptyLabel="На эту работу никто не ссылается."
					hasContent={inboundRefs.length > 0}
				>
					<Flex flexDirection="column" gap={8}>
						{inboundRefs.map((refItem) => (
							<Flex
								key={refItem.id}
								alignItems="center"
								justifyContent="space-between"
								gap={8}
								wrap="wrap"
							>
								<Flex flexDirection="column" minWidth="0">
									<Typography variant="body2" fontWeight={600} noWrap>
										{refItem.workName}
									</Typography>
									<Typography variant="caption" color="text.secondary" noWrap>
										{refItem.templateName} · {refItem.formulaText}
									</Typography>
								</Flex>
								<Button size="small" onClick={() => onSelectItem(refItem.id)}>
									Открыть
								</Button>
							</Flex>
						))}
					</Flex>
				</DetailSection>

				<Typography variant="caption" color="text.disabled">
					Обновлено: {new Date(item.updatedAt).toLocaleString("ru-RU")}
				</Typography>
			</Flex>
		</Card>
	);
}
