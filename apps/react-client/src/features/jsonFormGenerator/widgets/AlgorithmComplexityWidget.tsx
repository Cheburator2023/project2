import {
	FormControl,
	FormHelperText,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type { WidgetProps } from "@rjsf/utils";
import type React from "react";
import { useEffect, useRef } from "react";

interface AlgorithmValue {
	algorithmType: string;
}

const algorithmTypes = [
	"Табличные данные",
	"Текстовая аналитика_Классические модели",
	"Текстовая аналитика_LLM",
	"Аудио Аналитика",
	"Компьютерное зрение_CV",
	"Оптимизационная задача",
	"Гео-аналитика",
	"Графовая аналитика",
];

const MAX_ALGORITHMS = 8;

const AlgorithmComplexityWidget: React.FC<WidgetProps> = ({
	value = [],
	onChange,
	formContext,
	required,
	readonly,
	disabled,
}) => {
	const modelsCount = formContext?.formData?.modelsCount || 1;
	const prevModelsCountRef = useRef(modelsCount);
	const prevValueLengthRef = useRef(value?.length || 0);

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
	const hasError = required && filledCount === 0;

	return (
		<Stack spacing={2} data-test-id="algorithm-complexity-widget--Stack-0">
			{/* Summary input */}
			<FormControl
				fullWidth
				error={hasError}
				data-test-id="algorithm-complexity-widget--FormControl-0"
			>
				<Typography
					variant="subtitle1"
					gutterBottom
					data-test-id="algorithm-complexity-widget--Typography-0"
				>
					Сложность алгоритма / тип ML задачи
				</Typography>
				<TextField
					value={getSummaryText()}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					sx={{ mb: 2 }}
					error={readonly ? false : hasError}
					slotProps={{ input: { readOnly: readonly } }}
					data-test-id="algorithm-complexity-widget--TextField-0"
				/>
				{!readonly && hasError && (
					<FormHelperText
						error
						data-test-id="algorithm-complexity-widget--FormHelperText-0"
					>
						Необходимо выбрать хотя бы один тип алгоритма
					</FormHelperText>
				)}
			</FormControl>
			{/* Algorithm type selectors */}
			{Array(maxCount)
				.fill(null)
				.map((_, index) => (
					<FormControl
						key={index}
						fullWidth
						error={hasError}
						data-test-id="algorithm-complexity-widget--FormControl-1"
					>
						<Typography
							variant="subtitle2"
							gutterBottom
							data-test-id="algorithm-complexity-widget--Typography-1"
						>
							Модель {index + 1}
						</Typography>
						<Select
							value={value?.[index]?.algorithmType || ""}
							onChange={(e) => handleAlgorithmChange(index, e.target.value)}
							error={readonly ? false : hasError}
							readOnly={readonly}
							data-test-id="algorithm-complexity-widget--Select-0"
						>
							<MenuItem
								value=""
								data-test-id="algorithm-complexity-widget--MenuItem-0"
							>
								<em data-test-id="algorithm-complexity-widget--em-0">
									Выберите тип алгоритма
								</em>
							</MenuItem>
							{algorithmTypes.map((type) => (
								<MenuItem
									key={type}
									value={type}
									disabled={isAlgorithmSelected(type, index)}
									data-test-id="algorithm-complexity-widget--MenuItem-1"
								>
									{type}
									{isAlgorithmSelected(type, index) && " (уже выбран)"}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				))}
		</Stack>
	);
};

export default AlgorithmComplexityWidget;
