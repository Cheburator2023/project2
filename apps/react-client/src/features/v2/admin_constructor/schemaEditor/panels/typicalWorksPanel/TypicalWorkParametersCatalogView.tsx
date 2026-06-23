import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkParameterDto,
	V2TypicalWorkParameterValueDto,
} from "@smart-anketa/api-contract";
import {
	useCreateV2WorkParameter,
	useCreateV2WorkParameterValue,
	useDeleteV2WorkParameter,
	useDeleteV2WorkParameterValue,
	useUpdateV2WorkParameter,
	useUpdateV2WorkParameterValue,
	useV2WorkParametersCatalog,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useEffect, useMemo, useState } from "react";

type ParameterDraft = {
	code: string;
	name: string;
	description: string;
};

type ValueDraft = {
	code: string;
	label: string;
	coefficient: string;
	sortOrder: string;
	validFrom: string;
	validTo: string;
};

function emptyParameterDraft(): ParameterDraft {
	return { code: "", name: "", description: "" };
}

function valueToDraft(value?: V2TypicalWorkParameterValueDto): ValueDraft {
	return {
		code: value?.code ?? "",
		label: value?.label ?? "",
		coefficient: value?.coefficient == null ? "" : String(value.coefficient),
		sortOrder: value == null ? "0" : String(value.sortOrder),
		validFrom: value?.validFrom ?? new Date().toISOString().slice(0, 10),
		validTo: value?.validTo ?? "",
	};
}

function parameterToDraft(param?: V2TypicalWorkParameterDto): ParameterDraft {
	return {
		code: param?.code ?? "",
		name: param?.name ?? "",
		description: param?.description ?? "",
	};
}

function parseOptionalNumber(value: string): number | null {
	const trimmed = value.trim().replace(",", ".");
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function activeValueLabel(value: V2TypicalWorkParameterValueDto): string {
	const today = new Date().toISOString().slice(0, 10);
	if (today < value.validFrom) return "будет действовать";
	if (value.validTo && today > value.validTo) return "истёк";
	return "активно";
}

export function TypicalWorkParametersCatalogView() {
	const { data, isLoading } = useV2WorkParametersCatalog({
		includeInactive: true,
	});
	const createParam = useCreateV2WorkParameter();
	const updateParam = useUpdateV2WorkParameter();
	const deleteParam = useDeleteV2WorkParameter();
	const createValue = useCreateV2WorkParameterValue();
	const updateValue = useUpdateV2WorkParameterValue();
	const deleteValue = useDeleteV2WorkParameterValue();

	const params = data?.items ?? [];
	const [selectedCode, setSelectedCode] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [paramDraft, setParamDraft] = useState<ParameterDraft>(
		emptyParameterDraft,
	);
	const [newValueDraft, setNewValueDraft] = useState<ValueDraft>(() =>
		valueToDraft(),
	);

	const selectedParam = useMemo(
		() => params.find((param) => param.code === selectedCode) ?? params[0],
		[params, selectedCode],
	);

	useEffect(() => {
		if (selectedParam) {
			setSelectedCode(selectedParam.code);
			setParamDraft(parameterToDraft(selectedParam));
		}
	}, [selectedParam?.code]);

	const filteredParams = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return params;
		return params.filter(
			(param) =>
				param.name.toLowerCase().includes(q) ||
				param.code.toLowerCase().includes(q),
		);
	}, [params, query]);

	const saveParam = async () => {
		try {
			if (selectedParam) {
				const oldCode = selectedParam.code;
				await updateParam.mutateAsync({
					code: oldCode,
					dto: {
						code: paramDraft.code,
						name: paramDraft.name,
						description: paramDraft.description,
					},
				});
				setSelectedCode(paramDraft.code);
				toast.success("Параметр сохранён");
			} else {
				const created = await createParam.mutateAsync(paramDraft);
				setSelectedCode(created.code);
				toast.success("Параметр создан");
			}
		} catch (error) {
			toast.error("Не удалось сохранить параметр", {
				description: apiErrorMessage(error),
			});
		}
	};

	const addValue = async () => {
		if (!selectedParam) return;
		try {
			await createValue.mutateAsync({
				paramCode: selectedParam.code,
				dto: {
					code: newValueDraft.code || null,
					label: newValueDraft.label,
					coefficient: parseOptionalNumber(newValueDraft.coefficient),
					sortOrder: parseOptionalNumber(newValueDraft.sortOrder) ?? 0,
					validFrom: newValueDraft.validFrom,
					validTo: newValueDraft.validTo || null,
				},
			});
			setNewValueDraft(valueToDraft());
			toast.success("Значение добавлено");
		} catch (error) {
			toast.error("Не удалось добавить значение", {
				description: apiErrorMessage(error),
			});
		}
	};

	const removeParam = async () => {
		if (!selectedParam) return;
		if (!window.confirm(`Удалить параметр «${selectedParam.name}» со значениями?`)) {
			return;
		}
		try {
			await deleteParam.mutateAsync(selectedParam.code);
			setSelectedCode(null);
			toast.success("Параметр удалён");
		} catch (error) {
			toast.error("Не удалось удалить параметр", {
				description: apiErrorMessage(error),
			});
		}
	};

	return (
		<Flex height="100%" minHeight="0" style={{ overflow: "hidden" }}>
			<Card
				padding="16px"
				width="320px"
				overflow="auto"
				sx={{
					flexShrink: 0,
					borderRadius: 0,
					border: 0,
					borderRight: "1px solid #e6e8ee",
				}}
			>
				<Flex alignItems="center" gap={1}>
					<Typography fontWeight={800}>Параметры</Typography>
					<Typography sx={{ color: "#8a93a3", fontSize: 12 }}>
						{params.length}
					</Typography>
					<Button
						size="small"
						onClick={() => {
							setSelectedCode(null);
							setParamDraft(emptyParameterDraft());
						}}
						sx={{ ml: "auto", textTransform: "none" }}
					>
						+ Параметр
					</Button>
				</Flex>
				<Spacer space={10} />
				<TextField
					size="small"
					fullWidth
					placeholder="Поиск по названию или коду"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<Spacer space={10} />
				{isLoading ? (
					<CircularProgress size={20} />
				) : (
					<Flex flexDirection="column" gap={0.5}>
						{filteredParams.map((param) => {
							const selected = param.code === selectedParam?.code;
							return (
								<Button
									key={param.code}
									onClick={() => setSelectedCode(param.code)}
									sx={{
										justifyContent: "flex-start",
										textTransform: "none",
										textAlign: "left",
										borderRadius: "8px",
										px: 1.2,
										py: 1,
										bgcolor: selected ? "#eef4ff" : "transparent",
										color: "#1d2435",
									}}
								>
									<Flex flexDirection="column" minWidth="0">
										<Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
											{param.name}
										</Typography>
										<Typography sx={{ fontSize: 10.5, color: "#8a93a3" }}>
											{param.code} · {param.values.length} знач.
										</Typography>
									</Flex>
								</Button>
							);
						})}
					</Flex>
				)}
			</Card>

			<Flex
				flexDirection="column"
				flexGrow={1}
				minWidth="0"
				padding="16px"
				style={{ overflow: "auto" }}
			>
				<Card padding="16px">
					<Flex alignItems="center" gap={1} wrap="wrap">
						<Typography fontWeight={800}>
							{selectedParam ? "Свойства параметра" : "Новый параметр"}
						</Typography>
						<Button
							size="small"
							variant="contained"
							onClick={() => void saveParam()}
							disabled={createParam.isPending || updateParam.isPending}
							sx={{ ml: "auto", textTransform: "none" }}
						>
							Сохранить
						</Button>
						{selectedParam ? (
							<IconButton
								size="small"
								title="Удалить параметр"
								onClick={() => void removeParam()}
								disabled={deleteParam.isPending}
							>
								<DeleteOutlineIcon fontSize="small" />
							</IconButton>
						) : null}
					</Flex>
					<Spacer space={12} />
					<Flex gap={1.5} wrap="wrap">
						<TextField
							size="small"
							label="Код"
							value={paramDraft.code}
							onChange={(event) =>
								setParamDraft((draft) => ({
									...draft,
									code: event.target.value,
								}))
							}
							sx={{ minWidth: 220 }}
						/>
						<TextField
							size="small"
							label="Название"
							value={paramDraft.name}
							onChange={(event) =>
								setParamDraft((draft) => ({
									...draft,
									name: event.target.value,
								}))
							}
							sx={{ flex: 1, minWidth: 280 }}
						/>
						<TextField
							size="small"
							label="Описание / подсказка"
							value={paramDraft.description}
							onChange={(event) =>
								setParamDraft((draft) => ({
									...draft,
									description: event.target.value,
								}))
							}
							multiline
							minRows={2}
							sx={{ width: "100%" }}
						/>
					</Flex>
				</Card>

				<Spacer space={12} />
				<Card padding="16px">
					<Typography fontWeight={800}>Значения параметра</Typography>
					<Spacer space={10} />
					{selectedParam ? (
						<Flex flexDirection="column" gap={1}>
							{selectedParam.values.map((value) => (
								<ParameterValueRow
									key={value.code}
									paramCode={selectedParam.code}
									value={value}
									onSave={updateValue.mutateAsync}
									onDelete={deleteValue.mutateAsync}
								/>
							))}
							<ParameterValueDraftRow
								draft={newValueDraft}
								onChange={setNewValueDraft}
								onAdd={() => void addValue()}
								disabled={createValue.isPending}
							/>
						</Flex>
					) : (
						<Typography sx={{ color: "#8a93a3", fontSize: 13 }}>
							Сначала сохраните параметр, затем добавьте значения.
						</Typography>
					)}
				</Card>
			</Flex>
		</Flex>
	);
}

function ParameterValueRow({
	paramCode,
	value,
	onSave,
	onDelete,
}: {
	paramCode: string;
	value: V2TypicalWorkParameterValueDto;
	onSave: (variables: {
		paramCode: string;
		valueCode: string;
		dto: {
			code: string;
			label: string;
			coefficient: number | null;
			sortOrder: number;
			validFrom: string;
			validTo: string | null;
		};
	}) => Promise<unknown>;
	onDelete: (variables: { paramCode: string; valueCode: string }) => Promise<unknown>;
}) {
	const [draft, setDraft] = useState<ValueDraft>(() => valueToDraft(value));

	useEffect(() => {
		setDraft(valueToDraft(value));
	}, [value.code]);

	const save = async () => {
		try {
			await onSave({
				paramCode,
				valueCode: value.code,
				dto: {
					code: draft.code,
					label: draft.label,
					coefficient: parseOptionalNumber(draft.coefficient),
					sortOrder: parseOptionalNumber(draft.sortOrder) ?? 0,
					validFrom: draft.validFrom,
					validTo: draft.validTo || null,
				},
			});
			toast.success("Значение сохранено");
		} catch (error) {
			toast.error("Не удалось сохранить значение", {
				description: apiErrorMessage(error),
			});
		}
	};

	const remove = async () => {
		if (!window.confirm(`Удалить значение «${value.label}»?`)) return;
		try {
			await onDelete({ paramCode, valueCode: value.code });
			toast.success("Значение удалено");
		} catch (error) {
			toast.error("Не удалось удалить значение", {
				description: apiErrorMessage(error),
			});
		}
	};

	return (
		<Flex alignItems="center" gap={1} wrap="wrap">
			<ValueFields draft={draft} onChange={setDraft} status={activeValueLabel(value)} />
			<Button size="small" onClick={() => void save()} sx={{ textTransform: "none" }}>
				Сохранить
			</Button>
			<IconButton size="small" title="Удалить значение" onClick={() => void remove()}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Flex>
	);
}

function ParameterValueDraftRow({
	draft,
	onChange,
	onAdd,
	disabled,
}: {
	draft: ValueDraft;
	onChange: (draft: ValueDraft) => void;
	onAdd: () => void;
	disabled: boolean;
}) {
	return (
		<Flex alignItems="center" gap={1} wrap="wrap">
			<ValueFields draft={draft} onChange={onChange} status="новое" />
			<Button
				size="small"
				variant="outlined"
				onClick={onAdd}
				disabled={disabled}
				sx={{ textTransform: "none" }}
			>
				+ Значение
			</Button>
		</Flex>
	);
}

function ValueFields({
	draft,
	onChange,
	status,
}: {
	draft: ValueDraft;
	onChange: (draft: ValueDraft) => void;
	status: string;
}) {
	const patch = (partial: Partial<ValueDraft>) => onChange({ ...draft, ...partial });

	return (
		<>
			<TextField
				size="small"
				label="Код"
				value={draft.code}
				onChange={(event) => patch({ code: event.target.value })}
				sx={{ width: 150 }}
			/>
			<TextField
				size="small"
				label="Значение"
				value={draft.label}
				onChange={(event) => patch({ label: event.target.value })}
				sx={{ flex: 1, minWidth: 240 }}
			/>
			<TextField
				size="small"
				label="Коэф."
				value={draft.coefficient}
				onChange={(event) => patch({ coefficient: event.target.value })}
				sx={{ width: 90 }}
			/>
			<TextField
				size="small"
				label="Порядок"
				value={draft.sortOrder}
				onChange={(event) => patch({ sortOrder: event.target.value })}
				sx={{ width: 90 }}
			/>
			<TextField
				size="small"
				type="date"
				label="С"
				value={draft.validFrom}
				onChange={(event) => patch({ validFrom: event.target.value })}
				InputLabelProps={{ shrink: true }}
				sx={{ width: 150 }}
			/>
			<TextField
				size="small"
				type="date"
				label="По"
				value={draft.validTo}
				onChange={(event) => patch({ validTo: event.target.value })}
				InputLabelProps={{ shrink: true }}
				sx={{ width: 150 }}
			/>
			<Typography sx={{ width: 110, color: "#8a93a3", fontSize: 12 }}>
				{status}
			</Typography>
		</>
	);
}
