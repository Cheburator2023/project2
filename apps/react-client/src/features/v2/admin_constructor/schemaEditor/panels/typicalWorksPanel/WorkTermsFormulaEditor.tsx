import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkFormulaTermsDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaTermDto,
} from "@smart-anketa/api-contract";
import {
	createTermId,
	defaultBaseNormTerm,
	defaultTermsFormula,
	formatTermsSummary,
	validateTermsFormula,
} from "@smart-anketa/api-contract";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { Flex } from "@react-client/common/primitives/Flex";
import { useMemo } from "react";

export type TransitiveSourceOption = {
	assignmentId: string;
	workId: string;
	workName: string;
	streamExecutor: string;
};

type WorkTermsFormulaEditorProps = {
	formulaTerms: V2TypicalWorkFormulaTermsDto;
	rounding: V2TypicalWorkRoundingDto;
	laborParams: V2TypicalWorkLaborParamGroupDto[];
	transitiveSources?: TransitiveSourceOption[];
	onFormulaTermsChange: (formulaTerms: V2TypicalWorkFormulaTermsDto) => void;
	onRoundingChange: (rounding: V2TypicalWorkRoundingDto) => void;
	readOnly?: boolean;
};

const ROUNDING_OPTIONS: {
	mode: V2TypicalWorkRoundingDto["mode"];
	label: string;
}[] = [
	{ mode: "CEIL", label: "вверх" },
	{ mode: "FLOOR", label: "вниз" },
	{ mode: "ROUND", label: "мат." },
	{ mode: "NONE", label: "без" },
];

const TERM_KIND_LABEL: Record<V2WorkFormulaTermDto["kind"], string> = {
	base_norm: "Базовый норматив",
	multiplier: "Множитель",
	additive: "Слагаемое",
	transitive: "Транзитивная ссылка",
};

function sortTerms(terms: V2WorkFormulaTermDto[]): V2WorkFormulaTermDto[] {
	return [...terms].sort((a, b) => a.order - b.order);
}

export function WorkTermsFormulaEditor({
	formulaTerms,
	rounding,
	laborParams,
	transitiveSources = [],
	onFormulaTermsChange,
	onRoundingChange,
	readOnly = false,
}: WorkTermsFormulaEditorProps) {
	const terms = useMemo(() => sortTerms(formulaTerms.terms), [formulaTerms.terms]);
	const validationError = useMemo(() => validateTermsFormula(terms), [terms]);
	const hasTransitive = terms.some((t) => t.kind === "transitive");

	const paramOptions = useMemo(
		() =>
			laborParams.map((group) => ({
				code: group.paramCode,
				name: group.paramName ?? group.paramCode,
			})),
		[laborParams],
	);

	const updateTerms = (nextTerms: V2WorkFormulaTermDto[]) => {
		const sorted = sortTerms(nextTerms);
		onFormulaTermsChange({
			version: 2,
			terms: sorted,
			text: formatTermsSummary(sorted),
		});
	};

	const addTerm = (kind: V2WorkFormulaTermDto["kind"]) => {
		if (readOnly) return;
		if (kind === "transitive") {
			updateTerms([
				{
					id: createTermId("trans"),
					kind: "transitive",
					title: "Транзитивная ссылка",
					order: 0,
					factors: [],
				},
			]);
			return;
		}
		const order = Math.max(-1, ...terms.map((t) => t.order)) + 1;
		updateTerms([
			...terms,
			{
				id: createTermId("term"),
				kind,
				title: kind === "multiplier" ? "Множитель" : "Слагаемое",
				order,
				baseValue: 1,
				factors: [],
			},
		]);
	};

	const updateTerm = (termId: string, patch: Partial<V2WorkFormulaTermDto>) => {
		updateTerms(
			terms.map((term) => (term.id === termId ? { ...term, ...patch } : term)),
		);
	};

	const removeTerm = (termId: string) => {
		const term = terms.find((t) => t.id === termId);
		if (!term || term.kind === "base_norm") return;
		updateTerms(terms.filter((t) => t.id !== termId));
	};

	const addFactor = (termId: string, paramCode: string) => {
		const param = paramOptions.find((p) => p.code === paramCode);
		if (!param) return;
		const term = terms.find((t) => t.id === termId);
		if (!term || term.factors.some((f) => f.paramCode === paramCode)) return;
		updateTerm(termId, {
			factors: [
				...term.factors,
				{
					id: createTermId("factor"),
					paramCode: param.code,
					paramName: param.name,
					order: term.factors.length,
				},
			],
		});
	};

	return (
		<Flex flexDirection="column" gap={12}>
			<Typography sx={{ fontSize: 12, color: "#6b7484" }}>
				{formulaTerms.text || "H"}
			</Typography>
			{validationError ? (
				<Typography sx={{ fontSize: 12, color: "#c62828" }}>{validationError}</Typography>
			) : null}

			<Flex flexDirection="column" gap={10}>
				{terms.map((term) => (
					<Flex
						key={term.id}
						flexDirection="column"
						gap={8}
						sx={{
							border: "1px solid #e6e8ee",
							borderRadius: "10px",
							p: "12px",
							bgcolor: term.kind === "base_norm" ? "#f6fcf8" : "#fff",
						}}
					>
						<Flex alignItems="center" gap={8} wrap="wrap">
							<Chip
								size="small"
								label={TERM_KIND_LABEL[term.kind]}
								sx={{ fontWeight: 700 }}
							/>
							{term.kind !== "base_norm" && term.kind !== "transitive" ? (
								<TextField
									size="small"
									label="Название"
									value={term.title}
									disabled={readOnly}
									onChange={(e) => updateTerm(term.id, { title: e.target.value })}
									sx={{ minWidth: 160, flex: 1 }}
								/>
							) : (
								<Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
									{term.title}
								</Typography>
							)}
							{term.kind !== "base_norm" ? (
								<IconButton
									size="small"
									aria-label="Удалить член"
									title="Удалить член"
									disabled={readOnly}
									onClick={() => removeTerm(term.id)}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							) : null}
						</Flex>

						{term.kind === "transitive" ? (
							<FormControl size="small" sx={{ minWidth: 280 }}>
								<SelectWithPlaceholder
									placeholder="Работа-источник"
									value={term.sourceAssignmentId ?? ""}
									disabled={readOnly}
									onChange={(e) => {
										const assignmentId = String(e.target.value);
										const source = transitiveSources.find(
											(s) => s.assignmentId === assignmentId,
										);
										updateTerm(term.id, {
											sourceAssignmentId: assignmentId || null,
											sourceWorkId: source?.workId ?? null,
											sourceWorkName: source?.workName ?? null,
										});
									}}
								>
									{transitiveSources.map((source) => (
										<MenuItem key={source.assignmentId} value={source.assignmentId}>
											{source.workName} · {source.streamExecutor}
										</MenuItem>
									))}
								</SelectWithPlaceholder>
							</FormControl>
						) : (
							<>
								{term.kind !== "base_norm" ? (
									<TextField
										size="small"
										type="number"
										label="Базовое значение"
										value={term.baseValue ?? 1}
										disabled={readOnly}
										onChange={(e) =>
											updateTerm(term.id, {
												baseValue: Number(e.target.value.replace(",", ".")),
											})
										}
										sx={{ maxWidth: 160 }}
									/>
								) : null}
								<Flex alignItems="center" gap={8} wrap="wrap">
									{term.factors.map((factor) => (
										<Chip
											key={factor.id}
											size="small"
											label={factor.paramName ?? factor.paramCode}
											onDelete={
												readOnly
													? undefined
													: () =>
															updateTerm(term.id, {
																factors: term.factors.filter(
																	(f) => f.id !== factor.id,
																),
															})
											}
										/>
									))}
									{paramOptions.length > 0 && !readOnly ? (
										<FormControl size="small" sx={{ minWidth: 180 }}>
											<SelectWithPlaceholder
												placeholder="+ Фактор"
												value=""
												onChange={(e) => addFactor(term.id, String(e.target.value))}
											>
												{paramOptions
													.filter(
														(p) =>
															!term.factors.some((f) => f.paramCode === p.code),
													)
													.map((p) => (
														<MenuItem key={p.code} value={p.code}>
															{p.name}
														</MenuItem>
													))}
											</SelectWithPlaceholder>
										</FormControl>
									) : null}
								</Flex>
							</>
						)}
					</Flex>
				))}
			</Flex>

			{!readOnly ? (
				<Flex gap={8} wrap="wrap">
					{!hasTransitive ? (
						<>
							<Button size="small" onClick={() => addTerm("multiplier")}>
								+ Множитель
							</Button>
							<Button size="small" onClick={() => addTerm("additive")}>
								+ Слагаемое
							</Button>
							{terms.length === 1 ? (
								<Button size="small" onClick={() => addTerm("transitive")}>
									→ Транзитивная ссылка
								</Button>
							) : null}
						</>
					) : null}
				</Flex>
			) : null}

			<Flex alignItems="center" gap={12} wrap="wrap">
				<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Округление</Typography>
				{ROUNDING_OPTIONS.map((option) => (
					<Chip
						key={option.mode}
						size="small"
						label={option.label}
						color={rounding.mode === option.mode ? "primary" : "default"}
						onClick={
							readOnly
								? undefined
								: () => onRoundingChange({ ...rounding, mode: option.mode })
						}
						clickable={!readOnly}
					/>
				))}
				{rounding.mode !== "NONE" ? (
					<TextField
						size="small"
						type="number"
						label="Шаг"
						value={rounding.step ?? 0.1}
						disabled={readOnly}
						onChange={(e) =>
							onRoundingChange({
								...rounding,
								step: Number(e.target.value.replace(",", ".")),
							})
						}
						sx={{ width: 100 }}
					/>
				) : null}
			</Flex>
		</Flex>
	);
}

export function ensureFormulaTerms(
	card: { formulaTerms?: V2TypicalWorkFormulaTermsDto; formula: { tokens: unknown[]; text: string } },
): V2TypicalWorkFormulaTermsDto {
	if (card.formulaTerms?.version === 2) return card.formulaTerms;
	return defaultTermsFormula();
}

export { defaultBaseNormTerm, defaultTermsFormula };
