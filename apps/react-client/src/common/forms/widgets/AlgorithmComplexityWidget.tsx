import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import {
	FormControl,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Typography,
} from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { WidgetProps } from "@rjsf/utils";
import { isEqual } from "lodash-es";
import React, { useEffect, useRef } from "react";
import ClearIcon from "@mui/icons-material/Clear";

interface AlgorithmValue {
	algorithmType: string;
}

const MAX_ALGORITHMS = 8;

export const AlgorithmComplexityWidget: React.FC<WidgetProps> = (props) => {
	const {
		value = [],
		onChange,
		formContext,
		required,
		readonly,
		options,
		disabled,
	} = props;

	const preview = props.options.preview;
	const modelsCount = formContext?.formData?.modelsCount || 1;
	const prevModelsCountRef = useRef(modelsCount);
	const prevValueLengthRef = useRef(value?.length || 0);
	const algorithmTypes =
		(props?.schema?.items as any)?.properties?.algorithmType.enum || [];

	useEffect(() => {
		const currentLength = value?.length || 0;

		// Only update if modelsCount has changed and the array length doesn't match
		if (
			modelsCount !== prevModelsCountRef.current ||
			currentLength !== modelsCount
		) {
			prevModelsCountRef.current = modelsCount;
			prevValueLengthRef.current = Math.min(modelsCount, MAX_ALGORITHMS);

			// Keep existing values and add/remove as needed, but limit to MAX_ALGORITHMS
			const newValue = Array(Math.min(modelsCount, MAX_ALGORITHMS))
				.fill(null)
				.map((_, index) => value[index] || { algorithmType: "" });

			onChange(newValue);
		}
	}, [modelsCount, onChange]);

	const handleAlgorithmChange = (index: number, algorithmType: string) => {
		const newValue = [...(value || [])];
		newValue[index] = { algorithmType };
		onChange(newValue);
	};

	// Get array of currently selected algorithm types (excluding empty selections)
	const getSelectedAlgorithms = (excludeIndex?: number) => {
		return (value as AlgorithmValue[])
			?.map((v: AlgorithmValue, i: number) =>
				i !== excludeIndex && v?.algorithmType ? v.algorithmType : null,
			)
			.filter(Boolean) as string[];
	};

	// Check if an algorithm type is already selected in another dropdown
	const isAlgorithmSelected = (algorithmType: string, currentIndex: number) => {
		const selectedAlgorithms = getSelectedAlgorithms(currentIndex);
		return selectedAlgorithms.includes(algorithmType);
	};

	// Get summary text for the disabled input
	const getSummaryText = () => {
		const filledCount =
			(value as AlgorithmValue[])?.filter((v) => v.algorithmType)?.length || 0;
		const maxCount = Math.min(modelsCount, MAX_ALGORITHMS);

		if (filledCount === 0) {
			return "Не выбраны типы алгоритмов";
		}

		if (modelsCount > MAX_ALGORITHMS) {
			return `Выбрано типов алгоритмов: ${filledCount} из ${maxCount} (максимум ${MAX_ALGORITHMS})`;
		}

		return `Выбрано типов алгоритмов: ${filledCount} из ${maxCount}`;
	};

	const maxCount = Math.min(modelsCount, MAX_ALGORITHMS);
	const filledCount =
		(value as AlgorithmValue[])?.filter((v) => v.algorithmType)?.length || 0;

	const store = useAnketaCRUDFormsStore();
	const wasValidated = store.anketaCreate_projectAssessmentForm?.wasValidated;
	const hasError = wasValidated && required && filledCount === 0;

	return (
		<Stack spacing={2}>
			{/* Summary input */}
			<FormControl fullWidth error={hasError}>
				<TextFieldCustom
					value={getSummaryText()}
					disabled={!preview}
					fullWidth
					variant="outlined"
					label={props.label}
					size="small"
					required={required}
					sx={{ mb: 2 }}
					error={readonly ? false : hasError}
					slotProps={{ input: { readOnly: readonly } }}
					data-test-id="algorithm-complexity-widget--TextField-0"
					slots={{
						inputLabel: (props) =>
							options.tooltip ? (
								<Flex gap={6}>
									<InputLabel {...props} />
									<div title={options.tooltip}>
										<InfoOutlineIcon
											sx={{
												scale: 0.8,
												color: "#88888877",
												position: "absolute",
												top: "-4px",
												right: "0",
											}}
										/>
									</div>
								</Flex>
							) : (
								<InputLabel {...props} />
							),
					}}
				/>
			</FormControl>

			{/* Algorithm type selectors */}
			{Array(maxCount)
				.fill(null)
				.map((_, index) => (
					<FormControl key={index} fullWidth error={hasError}>
						<Typography variant="subtitle2" gutterBottom>
							Модель {index + 1}
						</Typography>
						<Select
							value={value?.[index]?.algorithmType || ""}
							onChange={(e) => handleAlgorithmChange(index, e.target.value)}
							error={hasError}
							readOnly={readonly}
							endAdornment={
								!isEqual("", value?.[index]?.algorithmType) &&
								!preview && (
									<InputAdornment
										position="end"
										sx={{
											position: "relative",
											right: 30,
											cursor: "pointer",
											zIndex: 999,
										}}
									>
										<ClearIcon
											onClick={(_e) => handleAlgorithmChange(index, "")}
										/>
									</InputAdornment>
								)
							}
							data-test-id="algorithm-complexity-widget--Select-0"
							slotProps={{
								input: {
									readOnly: readonly,
								},
							}}
						>
							{algorithmTypes.map((type: string) => {
								const isEmpty = type === "";

								return isEmpty ? (
									<MenuItem key={type} value={type}>
										Сбросить
									</MenuItem>
								) : (
									<MenuItem
										key={type}
										value={type}
										disabled={isAlgorithmSelected(type, index)}
										data-test-id="algorithm-complexity-widget--MenuItem-1"
									>
										{type}
										{isAlgorithmSelected(type, index) && " (уже выбран)"}
									</MenuItem>
								);
							})}
						</Select>
					</FormControl>
				))}
		</Stack>
	);
};
