import { COEFF_IGNORED_ERROR_PREFIX } from "@react-client/common/errors/constants";
import { calculateTotalGeneralUncertaintyCoefficient } from "./generalUncertaintyCoefficient";

export function calculateModelsCoefficient(modelsCount: number): number {
	if (modelsCount < 1) {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX + "Количество моделей должно быть не меньше 1",
		);
	}

	if (modelsCount === 1) {
		return 1;
	}

	return 1 + (modelsCount - 1) * 0.75;
}

export function calculateSetupComplexityCoefficient(
	setupComplexity: string | undefined,
): number {
	if (!setupComplexity) {
		return 1;
	}
	switch (setupComplexity) {
		case "1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено":
			return 1;
		case "2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска":
			return 1.25;
		case "3 Сложность: Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели":
			return 1.5;
		case "4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором":
			return 1.75;
		case "5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию":
			return 2;
		default:
			throw new Error(
				COEFF_IGNORED_ERROR_PREFIX +
					"Некорректное значение сложности постановки. Ожидается одна из строк enum из схемы.",
			);
	}
}

export function calculateTotalUncertainty(
	generalUncertainty: Array<{
		type: string;
		influence: string;
		probability: string;
	}>,
	initiativeTimeline: string,
	initiativeCost: string,
	correctionPercent = 0,
): number {
	if (!Array.isArray(generalUncertainty)) return 0;

	// Map each item to the new input format, using the common timeline/cost
	const items = generalUncertainty.map((item) => ({
		initiativeTimeline,
		initiativeCost,
		influence: item.influence,
		probability: item.probability,
	}));

	const sumOfCoefficients = calculateTotalGeneralUncertaintyCoefficient(items);
	const baseUncertainty = sumOfCoefficients + 1;
	const result = baseUncertainty + correctionPercent / 100;
	return Math.round(result * 100) / 100;
}

export function getReadyPromReportsCoefficient(
	readyPromReports: string,
): number {
	if (readyPromReports === "Да") {
		return 0.5;
	} else if (readyPromReports === "Нет") {
		return 1;
	} else {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX +
				"Некорректное значение поля 'readyPromReports'. Ожидается 'Да' или 'Нет'.",
		);
	}
}

export function calculateDataSourceCoefficient(
	dataSourceCount: number,
): number {
	const coefficients: Record<number, number> = {
		0: 1,
		1: 1,
		2: 1.2,
		3: 1.4,
		4: 1.6,
		5: 1.8,
		6: 2,
		7: 2.2,
		8: 2.4,
		9: 2.6,
		10: 3,
	};

	const coefficient = coefficients[dataSourceCount];
	if (coefficient === undefined) {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX +
				"Количество источников должно быть числом от 1 до 10",
		);
	}

	return coefficient;
}

export function getPilotModelCoefficient(pilotModelRequired: string): number {
	if (pilotModelRequired === "Да") {
		return 1;
	} else if (pilotModelRequired === "Не требуется") {
		return 0;
	} else {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX +
				"Некорректное значение поля 'pilotModelRequired'. Ожидается 'Да' или 'Не требуется'.",
		);
	}
}

export function calculateAlgorithmComplexityCoefficient(
	algorithmTypes: { algorithmType: string }[],
): number {
	const coefficientMap: Record<string, number> = {
		"Табличные данные": 0.75,
		"Текстовая аналитика_Классические модели": 1.25,
		"Текстовая аналитика_LLM": 1.4,
		"Аудио Аналитика": 1.6,
		"Компьютерное зрение_CV": 1.8,
		"Оптимизационная задача": 2.5,
		"Гео-аналитика": 3.0,
		"Графовая аналитика": 3.5,
	};

	return algorithmTypes.reduce((total, item) => {
		const type = item.algorithmType;
		if (!type || !(type in coefficientMap)) {
			// skip empty or unknown types
			return total;
		}
		return total + coefficientMap[type];
	}, 0);
}

export function getPilotSupportCoefficient(
	pilotSupportRequired: string,
): number {
	if (pilotSupportRequired === "Да") {
		return 1;
	} else if (pilotSupportRequired === "Не требуется") {
		return 0;
	} else {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX +
				"Некорректное значение поля 'pilotSupportRequired'. Ожидается 'Да' или 'Не требуется'.",
		);
	}
}

export function getAutoMlCoefficient(autoMlRequired: string): number {
	if (autoMlRequired === "Да") {
		return 1;
	} else if (autoMlRequired === "Не требуется") {
		return 0;
	} else {
		throw new Error(
			COEFF_IGNORED_ERROR_PREFIX +
				"Некорректное значение поля 'autoMlRequired'. Ожидается 'Да' или 'Не требуется'.",
		);
	}
}

export function getProductionAdditionalReportsCoefficient(
	value: string,
): number {
	if (value === "Не требуется") {
		return 0;
	}

	const numValue = Number.parseInt(value, 10);

	if (numValue < 1 || numValue > 99) {
		// throw new Error(
		// 	COEFF_IGNORED_ERROR_PREFIX +
		// 		"Значение должно быть 'Не требуется' или число от 1 до 99",
		// );
		return 0;
	}

	if (numValue === 1) {
		return 1;
	}

	return 1 + (numValue - 1) * 0.75;
}

export function calculateDeploymentChannelCoefficient(
	channels: string[],
): number {
	const coefficientMap: Record<string, number> = {
		Батч: 0.5,
		"Батч+загрузка данных потребителю": 0.75,
		"Батч + Онлайн": 1.2,
		Онлайн: 1.0,
		"Онлайн gpu": 1.25,
		Стриминг: 1.5,
		"Мобильные устройства": 1.75,
		LLM: 2.0,
		"Гео-сервисы": 2.25,
		"Внедрение в облаке": 2.5,
		"Графовая платформа": 3.0,
	};

	return channels.reduce((total, channel) => {
		const coef = coefficientMap[channel];
		if (coef === undefined) {
			throw new Error(
				COEFF_IGNORED_ERROR_PREFIX + `Неизвестный канал внедрения: ${channel}`,
			);
		}
		return total + coef;
	}, 0);
}
