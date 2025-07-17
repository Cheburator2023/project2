import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
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
	ListItemButton,
	ListItemSecondaryAction,
	ListItemText,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { WidgetProps } from "@rjsf/utils";
import React, { useEffect, useRef, useState } from "react";

interface UncertaintyItem {
	type: string;
	probability: string;
	influence: string;
}

export const GeneralUncertaintyWidget: React.FC<WidgetProps> = (props) => {
	const { value = [], onChange, formContext, schema, required } = props;

	const tooltips = props.options?.tooltips;

	const enums: string[] = (props?.schema?.items as any)?.properties?.type?.enum;
	const enumNames: string[] = (props?.schema?.items as any)?.properties?.type
		?.enumNames;

	const uncertaintyOptions = enums?.map((enumValue, index) => ({
		id: enumValue,
		title: enumNames?.[index] || enumValue,
		tooltip: tooltips?.[index] || "",
	}));

	const influenceOptions: string[] = (props?.schema?.items as any)?.properties
		?.influence.enum;
	const probabilityOptions: string[] = (props?.schema?.items as any)?.properties
		?.probability.enum;

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
		<Stack spacing={2}>
			<FormControl fullWidth disabled={!isEnabled}>
				{/* Summary input */}
				<TextFieldCustom
					value={getSummaryText()}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					label={props.label}
				/>
				{!isEnabled && (
					<FormHelperText>
						Заполните "Стоимость инициативы" и "Сроки инициативы" для добавления
						факторов неопределенности
					</FormHelperText>
				)}
				{/* <Spacer space={24} /> */}
				{/* Display selected items */}
				<List>
					{(value as UncertaintyItem[]).map((item, index) => (
						<ListItem key={index} divider>
							<ListItemText
								primary={getItemTitle(item.type)}
								secondary={
									<React.Fragment>
										<Typography
											component="span"
											variant="body2"
											color="textSecondary"
											display="block"
										>
											<strong>Вероятность наступления риска:</strong>{" "}
											{item.probability}
										</Typography>
										<Typography
											component="span"
											variant="body2"
											color="textSecondary"
											display="block"
										>
											<strong>Влияние риска на цели инициативы:</strong>{" "}
											{item.influence}
										</Typography>
									</React.Fragment>
								}
							/>
							<ListItemSecondaryAction>
								<IconButton
									edge="end"
									onClick={() => handleDelete(index)}
									size="small"
								>
									<DeleteIcon />
								</IconButton>
							</ListItemSecondaryAction>
						</ListItem>
					))}
				</List>
				{/* Add button */}
				<Button
					startIcon={<AddIcon />}
					onClick={handleAddClick}
					disabled={!isEnabled || getAvailableOptions().length === 0}
					variant="outlined"
					sx={{ mt: 2 }}
					color="primary"
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
			>
				<DialogTitle>Добавить фактор неопределенности</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 2 }}>
						{/* Available items */}
						<FormControl fullWidth>
							<Typography variant="subtitle2" gutterBottom>
								Выберите фактор:
							</Typography>
							<List
								sx={{
									maxHeight: "300px",
									overflow: "auto",
									border: "1px solid rgba(0, 0, 0, 0.12)",
									borderRadius: 1,
								}}
							>
								{getAvailableOptions().map((option) => (
									<ListItemButton
										key={option.id}
										selected={option.id === selectedItem}
										component="button"
										onClick={() => handleItemSelect(option.id)}
									>
										<ListItemText primary={option.title} />
										<Tooltip title={option.tooltip}>
											<InfoOutlineIcon sx={{ opacity: 0.2 }} />
										</Tooltip>
									</ListItemButton>
								))}
							</List>
						</FormControl>

						{/* Probability select */}
						<FormControl fullWidth>
							<Typography variant="subtitle2" gutterBottom>
								Вероятность наступления риска:
							</Typography>
							<TextFieldCustom
								select
								value={probability}
								onChange={(e) => setProbability(e.target.value)}
								SelectProps={{
									native: true,
								}}
								fullWidth
								size="small"
							>
								<option value="">Выберите вероятность</option>
								{probabilityOptions.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</TextFieldCustom>
						</FormControl>

						{/* Influence select */}
						<FormControl fullWidth>
							<Typography variant="subtitle2" gutterBottom>
								Влияние риска на цели инициативы:
							</Typography>
							<TextFieldCustom
								select
								value={influence}
								onChange={(e) => setInfluence(e.target.value)}
								SelectProps={{
									native: true,
								}}
								fullWidth
								size="small"
							>
								<option value="">Выберите влияние</option>
								{influenceOptions.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</TextFieldCustom>
						</FormControl>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleDialogClose}>Отмена</Button>
					<Button
						onClick={handleAdd}
						disabled={!selectedItem || !probability || !influence}
						variant="contained"
						color="primary"
					>
						Добавить
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};
