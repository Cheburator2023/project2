import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormHelperText,
	IconButton,
	List,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { WidgetProps } from "@rjsf/utils";
import React, { useState, useEffect, useRef } from "react";

interface UncertaintyItem {
	type: string;
	probability: string;
	influence: string;
}

const uncertaintyOptions = [
	{
		id: "businessProcessComplexity",
		title:
			"Изменение, недостаточная проработка или сложности бизнес-процессов Банка",
	},
	{
		id: "projectSolutionDefects",
		title: "Наличие дефектов во внедряемом решении/ПО в рамках проекта",
	},
	{
		id: "adjacentProjectsImpact",
		title: "Негативное влияние смежных проектов на показатели проекта",
	},
	{
		id: "planningRequirementGaps",
		title:
			"Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
	},
	{
		id: "contractorPerformanceIssues",
		title:
			"Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков",
	},
	{
		id: "qualifiedStaffShortage",
		title: "Отсутствие квалифицированного персонала или ошибок персонала",
	},
	{
		id: "sanctionsRisk",
		title: "Введение санкционных мер и других ограничений",
	},
	{
		id: "controlProceduresGaps",
		title: "Недостаток или отсутствие контрольных процедур",
	},
	{
		id: "regulatoryChanges",
		title: "Изменение регуляторных требований",
	},
	{
		id: "systemUnderutilization",
		title: "Неиспользование ИС после завершения проекта",
	},
	{
		id: "itArchitectureChanges",
		title: "Изменение целевой ИТ архитектуры Банка",
	},
];

const probabilityOptions = [
	"Не применимо",
	"Реализация не чаще 1 раза в 10 лет",
	"Реализация 1 раз в 3-10 лет",
	"Реализация 1 раз в 1-3 года",
	"Реализация 1 раз в год",
	"Реализация 1 раз в 6 мес. или чаще",
];

const influenceOptions = [
	"Не применимо",
	"Незначительное",
	"Умеренное",
	"Существенное",
	"Критическое",
	"Катастрофическое",
];

const GeneralUncertaintyWidget: React.FC<WidgetProps> = ({
	value = [],
	onChange,
	formContext,
	schema,
	required,
	readonly,
}) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<string | null>(null);
	const [probability, setProbability] = useState<string>("");
	const [influence, setInfluence] = useState<string>("");

	const { initiativeCost, initiativeTimeline } = formContext?.formData || {};
	const isEnabled = initiativeCost && initiativeTimeline;

	// Track previous enabled state
	const prevEnabled = useRef(isEnabled);

	useEffect(() => {
		if (prevEnabled.current && !isEnabled) {
			// Just transitioned from enabled to disabled
			if (Array.isArray(value) && value.length > 0) {
				onChange([]);
			}
		}
		prevEnabled.current = isEnabled;
	}, [isEnabled, onChange, value]);

	// Get available options (not yet selected)
	const getAvailableOptions = () => {
		const selectedIds = (value as UncertaintyItem[]).map((item) => item.type);
		return uncertaintyOptions.filter(
			(option) => !selectedIds.includes(option.id),
		);
	};

	// Get summary text for the disabled input
	const getSummaryText = () => {
		const count = (value as UncertaintyItem[])?.length || 0;
		if (count === 0) {
			return "Не выбраны факторы неопределенности";
		}
		return `Выбрано факторов неопределенности: ${count}`;
	};

	const handleAddClick = () => {
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedItem(null);
		setProbability("");
		setInfluence("");
	};

	const handleItemSelect = (id: string) => {
		setSelectedItem(id);
	};

	const handleAdd = () => {
		if (selectedItem && probability && influence) {
			const newValue = [
				...(value as UncertaintyItem[]),
				{
					type: selectedItem,
					probability,
					influence,
				},
			];
			onChange(newValue);
			handleDialogClose();
		}
	};

	const handleDelete = (index: number) => {
		const newValue = [...(value as UncertaintyItem[])];
		newValue.splice(index, 1);
		onChange(newValue);
	};

	const getItemTitle = (id: string) => {
		return uncertaintyOptions.find((opt) => opt.id === id)?.title || id;
	};

	return (
		<Stack spacing={2} data-test-id="general-uncertainty-widget--Stack-0">
			<FormControl
				fullWidth
				disabled={!isEnabled}
				data-test-id="general-uncertainty-widget--FormControl-0"
			>
				<Typography
					variant="subtitle1"
					gutterBottom
					data-test-id="general-uncertainty-widget--Typography-0"
				>
					Общая неопределенность
				</Typography>
				{!readonly && !isEnabled && (
					<FormHelperText
						error
						data-test-id="general-uncertainty-widget--FormHelperText-0"
					>
						Заполните "Стоимость инициативы" и "Сроки инициативы" для добавления
						факторов неопределенности
					</FormHelperText>
				)}
				{/* Summary input */}
				<TextField
					value={getSummaryText()}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					sx={{ mb: 2 }}
					slotProps={{ input: { readOnly: readonly } }}
					data-test-id="general-uncertainty-widget--TextField-0"
				/>
				{/* Display selected items */}
				<List data-test-id="general-uncertainty-widget--List-0">
					{(value as UncertaintyItem[]).map((item, index) => (
						<ListItem
							key={index}
							divider
							data-test-id="general-uncertainty-widget--ListItem-0"
						>
							<ListItemText
								primary={getItemTitle(item.type)}
								secondary={
									<React.Fragment>
										<Typography
											component="span"
											variant="body2"
											color="textSecondary"
											display="block"
											data-test-id="general-uncertainty-widget--Typography-1"
										>
											<strong data-test-id="general-uncertainty-widget--strong-0">
												Вероятность:
											</strong>{" "}
											{item.probability}
										</Typography>
										<Typography
											component="span"
											variant="body2"
											color="textSecondary"
											display="block"
											data-test-id="general-uncertainty-widget--Typography-2"
										>
											<strong data-test-id="general-uncertainty-widget--strong-1">
												Влияние:
											</strong>{" "}
											{item.influence}
										</Typography>
									</React.Fragment>
								}
								data-test-id="general-uncertainty-widget--ListItemText-0"
							/>
							<ListItemSecondaryAction data-test-id="general-uncertainty-widget--ListItemSecondaryAction-0">
								<IconButton
									edge="end"
									onClick={() => handleDelete(index)}
									size="small"
									data-test-id="general-uncertainty-widget--IconButton-0"
								>
									<DeleteIcon data-test-id="general-uncertainty-widget--DeleteIcon-0" />
								</IconButton>
							</ListItemSecondaryAction>
						</ListItem>
					))}
				</List>
				{/* Add button */}
				<Button
					startIcon={
						<AddIcon data-test-id="general-uncertainty-widget--AddIcon-0" />
					}
					onClick={handleAddClick}
					disabled={!isEnabled || getAvailableOptions().length === 0}
					variant="outlined"
					sx={{ mt: 2 }}
					color="primary"
					data-test-id="general-uncertainty-widget--Button-0"
				>
					Добавить фактор неопределенности
				</Button>
			</FormControl>
			{/* Add dialog */}
			<Dialog
				open={isDialogOpen}
				onClose={handleDialogClose}
				maxWidth="md"
				fullWidth
				data-test-id="general-uncertainty-widget--Dialog-0"
			>
				<DialogTitle data-test-id="general-uncertainty-widget--DialogTitle-0">
					Добавить фактор неопределенности
				</DialogTitle>
				<DialogContent data-test-id="general-uncertainty-widget--DialogContent-0">
					<Stack
						spacing={3}
						sx={{ mt: 2 }}
						data-test-id="general-uncertainty-widget--Stack-1"
					>
						{/* Available items */}
						<FormControl
							fullWidth
							data-test-id="general-uncertainty-widget--FormControl-1"
						>
							<Typography
								variant="subtitle2"
								gutterBottom
								data-test-id="general-uncertainty-widget--Typography-3"
							>
								Выберите фактор:
							</Typography>
							<List
								sx={{
									maxHeight: "200px",
									overflow: "auto",
									border: "1px solid rgba(0, 0, 0, 0.12)",
									borderRadius: 1,
								}}
								data-test-id="general-uncertainty-widget--List-1"
							>
								{getAvailableOptions().map((option) => (
									<ListItem
										key={option.id}
										component="button"
										// button
										// selected={selectedItem === option.id}
										onClick={() => handleItemSelect(option.id)}
										sx={{
											"&.Mui-selected": {
												backgroundColor: "primary.light",
												"&:hover": {
													backgroundColor: "primary.light",
												},
											},
										}}
										data-test-id="general-uncertainty-widget--ListItem-1"
									>
										<ListItemText
											primary={option.title}
											primaryTypographyProps={{
												style: { fontSize: "0.9rem" },
											}}
											data-test-id="general-uncertainty-widget--ListItemText-1"
										/>
									</ListItem>
								))}
							</List>
						</FormControl>
						{/* Probability select */}
						<FormControl
							fullWidth
							data-test-id="general-uncertainty-widget--FormControl-2"
						>
							<Typography
								variant="subtitle2"
								gutterBottom
								data-test-id="general-uncertainty-widget--Typography-4"
							>
								Вероятность:
							</Typography>
							<TextField
								select
								value={probability}
								onChange={(e) => setProbability(e.target.value)}
								SelectProps={{
									native: true,
								}}
								fullWidth
								size="small"
								data-test-id="general-uncertainty-widget--TextField-1"
							>
								<option
									value=""
									data-test-id="general-uncertainty-widget--option-0"
								>
									Выберите вероятность
								</option>
								{probabilityOptions.map((option) => (
									<option
										key={option}
										value={option}
										data-test-id="general-uncertainty-widget--option-1"
									>
										{option}
									</option>
								))}
							</TextField>
						</FormControl>
						{/* Influence select */}
						<FormControl
							fullWidth
							data-test-id="general-uncertainty-widget--FormControl-3"
						>
							<Typography
								variant="subtitle2"
								gutterBottom
								data-test-id="general-uncertainty-widget--Typography-5"
							>
								Влияние:
							</Typography>
							<TextField
								select
								value={influence}
								onChange={(e) => setInfluence(e.target.value)}
								SelectProps={{
									native: true,
								}}
								fullWidth
								size="small"
								data-test-id="general-uncertainty-widget--TextField-2"
							>
								<option
									value=""
									data-test-id="general-uncertainty-widget--option-2"
								>
									Выберите влияние
								</option>
								{influenceOptions.map((option) => (
									<option
										key={option}
										value={option}
										data-test-id="general-uncertainty-widget--option-3"
									>
										{option}
									</option>
								))}
							</TextField>
						</FormControl>
					</Stack>
				</DialogContent>
				<DialogActions data-test-id="general-uncertainty-widget--DialogActions-0">
					<Button
						onClick={handleDialogClose}
						data-test-id="general-uncertainty-widget--Button-1"
					>
						Отмена
					</Button>
					<Button
						onClick={handleAdd}
						disabled={!selectedItem || !probability || !influence}
						variant="contained"
						color="primary"
						data-test-id="general-uncertainty-widget--Button-2"
					>
						Добавить
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default GeneralUncertaintyWidget;
