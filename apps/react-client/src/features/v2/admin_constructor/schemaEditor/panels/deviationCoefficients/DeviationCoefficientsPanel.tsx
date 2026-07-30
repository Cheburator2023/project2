import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	createDefaultDeviationCoefficientsConfig,
	mergeDeviationCoefficientsConfigIntoLogic,
	parseDeviationCoefficientsConfigFromLogic,
	type V2DeviationCoefficientsConfig,
	type V2DeviationLabelCoefficient,
	type V2DeviationWorkEntry,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchemaEditor } from "../../SchemaEditorContext";

function LabelCoeffTable({
	title,
	rows,
	onChange,
}: {
	title: string;
	rows: V2DeviationLabelCoefficient[];
	onChange: (next: V2DeviationLabelCoefficient[]) => void;
}) {
	return (
		<Box>
			<Typography variant="subtitle2" fontWeight={700} mb={1}>
				{title}
			</Typography>
			<Stack spacing={1}>
				{rows.map((row, index) => (
					<Stack
						key={`${row.label}-${index}`}
						direction="row"
						spacing={1}
						alignItems="center"
					>
						<TextField
							size="small"
							label="Метка"
							value={row.label}
							fullWidth
							onChange={(e) => {
								const next = [...rows];
								next[index] = { ...row, label: e.target.value };
								onChange(next);
							}}
						/>
						<TextField
							size="small"
							label="Коэф."
							type="number"
							value={row.coefficient}
							sx={{ width: 120 }}
							onChange={(e) => {
								const coefficient = Number(e.target.value);
								const next = [...rows];
								next[index] = {
									...row,
									coefficient: Number.isFinite(coefficient)
										? coefficient
										: row.coefficient,
								};
								onChange(next);
							}}
						/>
						<IconButton
							size="small"
							title="Удалить"
							onClick={() => onChange(rows.filter((_, i) => i !== index))}
						>
							<DeleteOutlineIcon fontSize="small" />
						</IconButton>
					</Stack>
				))}
				<Button
					size="small"
					startIcon={<AddIcon />}
					onClick={() =>
						onChange([...rows, { label: "Новая метка", coefficient: 1 }])
					}
				>
					Добавить
				</Button>
			</Stack>
		</Box>
	);
}

export function DeviationCoefficientsPanel() {
	const { logic, setLogic } = useSchemaEditor();
	const parsed = useMemo(
		() => parseDeviationCoefficientsConfigFromLogic(logic.rules),
		[logic.rules],
	);
	const [draft, setDraft] = useState<V2DeviationCoefficientsConfig>(parsed);

	useEffect(() => {
		setDraft(parsed);
	}, [parsed]);

	const persist = useCallback(
		(next: V2DeviationCoefficientsConfig) => {
			setDraft(next);
			setLogic({
				rules: mergeDeviationCoefficientsConfigIntoLogic(logic.rules, next),
			});
		},
		[logic.rules, setLogic],
	);

	const updateWorks = (works: V2DeviationWorkEntry[]) =>
		persist({ ...draft, works });

	return (
		<Box sx={{ height: "100%", overflow: "auto", p: 2 }}>
			<Stack spacing={2.5} maxWidth={920}>
				<Alert severity="info">
					Коэффициенты СФЕРА/отклонений раньше были захардкожены в расчёте.
					Здесь их можно править; список работ — какие строки участвуют в
					колонках отклонений панели итогов (модельные по умолчанию + любые
					добавленные).
				</Alert>

				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
						Коэффициенты отклонений
					</Typography>
					<Button
						size="small"
						startIcon={<RestartAltIcon />}
						onClick={() => persist(createDefaultDeviationCoefficientsConfig())}
					>
						Сбросить к дефолту
					</Button>
				</Stack>

				<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
					<TextField
						size="small"
						label="Прирост за модель (>1)"
						type="number"
						value={draft.modelsCountIncrement}
						onChange={(e) => {
							const modelsCountIncrement = Number(e.target.value);
							if (!Number.isFinite(modelsCountIncrement)) return;
							persist({ ...draft, modelsCountIncrement });
						}}
					/>
					<TextField
						size="small"
						label="Готовые пром. отчёты = Да"
						type="number"
						value={draft.readyPromYesCoefficient}
						onChange={(e) => {
							const readyPromYesCoefficient = Number(e.target.value);
							if (!Number.isFinite(readyPromYesCoefficient)) return;
							persist({ ...draft, readyPromYesCoefficient });
						}}
					/>
					<TextField
						size="small"
						label="Прирост доп. отчётов"
						type="number"
						value={draft.productionReportsIncrement}
						onChange={(e) => {
							const productionReportsIncrement = Number(e.target.value);
							if (!Number.isFinite(productionReportsIncrement)) return;
							persist({ ...draft, productionReportsIncrement });
						}}
					/>
				</Stack>

				<Box>
					<Typography variant="subtitle2" fontWeight={700} mb={1}>
						Коэф. по числу источников
					</Typography>
					<Stack spacing={1}>
						{draft.sourceCountSteps.map((step, index) => (
							<Stack
								key={`src-${step.count}-${index}`}
								direction="row"
								spacing={1}
								alignItems="center"
							>
								<TextField
									size="small"
									label="Кол-во"
									type="number"
									value={step.count}
									sx={{ width: 120 }}
									onChange={(e) => {
										const count = Number(e.target.value);
										const next = [...draft.sourceCountSteps];
										next[index] = {
											...step,
											count: Number.isFinite(count) ? count : step.count,
										};
										persist({ ...draft, sourceCountSteps: next });
									}}
								/>
								<TextField
									size="small"
									label="Коэф."
									type="number"
									value={step.coefficient}
									sx={{ width: 120 }}
									onChange={(e) => {
										const coefficient = Number(e.target.value);
										const next = [...draft.sourceCountSteps];
										next[index] = {
											...step,
											coefficient: Number.isFinite(coefficient)
												? coefficient
												: step.coefficient,
										};
										persist({ ...draft, sourceCountSteps: next });
									}}
								/>
								<IconButton
									size="small"
									onClick={() =>
										persist({
											...draft,
											sourceCountSteps: draft.sourceCountSteps.filter(
												(_, i) => i !== index,
											),
										})
									}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							</Stack>
						))}
						<Button
							size="small"
							startIcon={<AddIcon />}
							onClick={() =>
								persist({
									...draft,
									sourceCountSteps: [
										...draft.sourceCountSteps,
										{
											count: draft.sourceCountSteps.length + 1,
											coefficient: 1,
										},
									],
								})
							}
						>
							Добавить ступень
						</Button>
					</Stack>
				</Box>

				<LabelCoeffTable
					title="Типы алгоритмов"
					rows={draft.algorithmTypeCoefficients}
					onChange={(algorithmTypeCoefficients) =>
						persist({ ...draft, algorithmTypeCoefficients })
					}
				/>
				<LabelCoeffTable
					title="Каналы внедрения"
					rows={draft.deploymentChannelCoefficients}
					onChange={(deploymentChannelCoefficients) =>
						persist({ ...draft, deploymentChannelCoefficients })
					}
				/>

				<Box>
					<Typography variant="subtitle2" fontWeight={700} mb={1}>
						Работы под отклонения
					</Typography>
					<Stack spacing={1}>
						{draft.works.map((work, index) => (
							<Stack
								key={work.workId}
								direction="row"
								spacing={1}
								alignItems="center"
							>
								<Checkbox
									checked={work.enabled}
									onChange={(e) => {
										const next = [...draft.works];
										next[index] = { ...work, enabled: e.target.checked };
										updateWorks(next);
									}}
									title="Участвует в отклонениях"
								/>
								<TextField
									size="small"
									label="Название"
									value={work.workName}
									fullWidth
									onChange={(e) => {
										const next = [...draft.works];
										next[index] = { ...work, workName: e.target.value };
										updateWorks(next);
									}}
								/>
								<TextField
									size="small"
									label="workId"
									value={work.workId}
									sx={{ width: 280 }}
									onChange={(e) => {
										const next = [...draft.works];
										next[index] = { ...work, workId: e.target.value.trim() };
										updateWorks(next);
									}}
								/>
								<IconButton
									size="small"
									onClick={() =>
										updateWorks(draft.works.filter((_, i) => i !== index))
									}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							</Stack>
						))}
						<Button
							size="small"
							startIcon={<AddIcon />}
							onClick={() =>
								updateWorks([
									...draft.works,
									{
										workId: `work-${Date.now()}`,
										workName: "Новая работа",
										enabled: true,
									},
								])
							}
						>
							Добавить работу
						</Button>
					</Stack>
				</Box>
			</Stack>
		</Box>
	);
}
