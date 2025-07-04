export function calculateModelsCoefficient(modelsCount: number): number {
	if (modelsCount < 1) {
		throw new Error("Количество моделей должно быть не меньше 1");
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
		case "4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию,но проведение регулярной валидации Моделей установлена Регулятором":
			return 1.75;
		case "5 Сложность: Банком планируестя предоставление Модели Регулятору для одобрения к использованию":
			return 2;
		default:
			throw new Error(
				"Некорректное значение сложности постановки. Ожидается одна из строк enum из схемы.",
			);
	}
}

export function calculateTotalUncertainty(
	generalUncertainty: Array<{
		initiativeTimeline?: string;
		initiativeCost?: string;
		influence: string;
		probability: string;
	}>,
	correctionPercent = 0,
): number {
	if (!Array.isArray(generalUncertainty)) return 0;
	const coeffs = generalUncertainty.map((item) => {
		if (
			!item.initiativeTimeline ||
			!item.initiativeCost ||
			!item.influence ||
			!item.probability
		) {
			return 0;
		}
		return calculateCoefficientForGeneralUncertaintyItem(
			item.initiativeTimeline,
			item.initiativeCost,
			item.influence,
			item.probability,
		);
	});

	const sumOfCoefficients = coeffs.reduce((sum, coef) => sum + coef, 0);
	const baseUncertainty = sumOfCoefficients + 1;
	const correctionFactor = 1 + correctionPercent / 100;

	return baseUncertainty * correctionFactor;
}

export function calculateCoefficientForGeneralUncertaintyItem(
	initiativeTimeline: string,
	initiativeCost: string,
	impactOfRisk: string,
	probabilityOfRisk: string,
): number {
	// Validate input
	if (
		!initiativeTimeline ||
		!initiativeCost ||
		!impactOfRisk ||
		!probabilityOfRisk
	) {
		throw new Error("All parameters must be provided");
	}

	// Define the conditions for each coefficient level
	const veryHighConditions = [
		{
			timeline: ["Более 18 мес."],
			cost: ["От 2 млрд"],
			impact: ["Критичное отклонение качества реализации проекта"],
			probability: [
				"Реализация 1 раз в 1-3 года",
				"Реализация 1 раз в год",
				"Реализация 1 раз в 6 мес. или чаще",
			],
		},
		{
			timeline: ["10-18 мес."],
			cost: ["870 млн. - 2 млрд."],
			impact: [
				"Значительный негативный эффект на возможность достижения целей проекта",
			],
			probability: [
				"Реализация 1 раз в год",
				"Реализация 1 раз в 6 мес. или чаще",
			],
		},
		{
			timeline: ["4-10 мес."],
			cost: ["438-870 млн."],
			impact: [
				"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			],
			probability: ["Реализация 1 раз в 6 мес. или чаще"],
		},
	];

	const highConditions = [
		{
			timeline: ["Более 18 мес."],
			cost: ["От 2 млрд"],
			impact: ["Критичное отклонение качества реализации проекта"],
			probability: ["Реализация 1 раз в 3-10 лет"],
		},
		{
			timeline: ["10-18 мес."],
			cost: ["870 млн. - 2 млрд."],
			impact: [
				"Значительный негативный эффект на возможность достижения целей проекта",
			],
			probability: ["Реализация 1 раз в 1-3 года"],
		},
		{
			timeline: ["4-10 мес."],
			cost: ["438-870 млн."],
			impact: [
				"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			],
			probability: ["Реализация 1 раз в 1-3 года", "Реализация 1 раз в год"],
		},
		{
			timeline: ["1-4 мес."],
			cost: ["45.3-438 млн."],
			impact: [
				"Незначительное влияние на задачи и сроки достижения целей проекта",
			],
			probability: [
				"Реализация 1 раз в год",
				"Реализация 1 раз в 6 мес. или чаще",
			],
		},
	];

	const mediumConditions = [
		{
			timeline: ["Более 18 мес."],
			cost: ["От 2 млрд"],
			impact: ["Критичное отклонение качества реализации проекта"],
			probability: ["Реализация не чаще 1 раза в 10 лет"],
		},
		{
			timeline: ["10-18 мес."],
			cost: ["870 млн. - 2 млрд."],
			impact: [
				"Значительный негативный эффект на возможность достижения целей проекта",
			],
			probability: [
				"Реализация не чаще 1 раза в 10 лет",
				"Реализация 1 раз в 3-10 лет",
			],
		},
		{
			timeline: ["4-10 мес."],
			cost: ["438-870 млн."],
			impact: [
				"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			],
			probability: ["Реализация 1 раз в 3-10 лет"],
		},
		{
			timeline: ["1-4 мес."],
			cost: ["45.3-438 млн."],
			impact: [
				"Незначительное влияние на задачи и сроки достижения целей проекта",
			],
			probability: ["Реализация 1 раз в 1-3 года"],
		},
		{
			timeline: ["Менее 1 мес."],
			cost: ["До 45.3 млн."],
			impact: [
				"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			],
			probability: [
				"Реализация 1 раз в год",
				"Реализация 1 раз в 6 мес. или чаще",
			],
		},
	];

	const lowConditions = [
		{
			timeline: ["4-10 мес."],
			cost: ["438-870 млн."],
			impact: [
				"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			],
			probability: ["Реализация не чаще 1 раза в 10 лет"],
		},
		{
			timeline: ["1-4 мес."],
			cost: ["45.3-438 млн."],
			impact: [
				"Незначительное влияние на задачи и сроки достижения целей проекта",
			],
			probability: [
				"Реализация не чаще 1 раза в 10 лет",
				"Реализация 1 раз в 3-10 лет",
			],
		},
		{
			timeline: ["Менее 1 мес."],
			cost: ["До 45.3 млн."],
			impact: [
				"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			],
			probability: [
				"Реализация не чаще 1 раза в 10 лет",
				"Реализация 1 раз в 3-10 лет",
				"Реализация 1 раз в 1-3 года",
			],
		},
	];

	// Check for Very High conditions
	for (const condition of veryHighConditions) {
		if (
			condition.timeline.includes(initiativeTimeline) &&
			condition.cost.includes(initiativeCost) &&
			condition.impact.includes(impactOfRisk) &&
			condition.probability.includes(probabilityOfRisk)
		) {
			return 0.1;
		}
	}

	// Check for High conditions
	for (const condition of highConditions) {
		if (
			condition.timeline.includes(initiativeTimeline) &&
			condition.cost.includes(initiativeCost) &&
			condition.impact.includes(impactOfRisk) &&
			condition.probability.includes(probabilityOfRisk)
		) {
			return 0.07;
		}
	}

	// Check for Medium conditions
	for (const condition of mediumConditions) {
		if (
			condition.timeline.includes(initiativeTimeline) &&
			condition.cost.includes(initiativeCost) &&
			condition.impact.includes(impactOfRisk) &&
			condition.probability.includes(probabilityOfRisk)
		) {
			return 0.05;
		}
	}

	// Check for Low conditions
	for (const condition of lowConditions) {
		if (
			condition.timeline.includes(initiativeTimeline) &&
			condition.cost.includes(initiativeCost) &&
			condition.impact.includes(impactOfRisk) &&
			condition.probability.includes(probabilityOfRisk)
		) {
			return 0.03;
		}
	}

	// Default case: Not Applicable
	return 0;
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
		throw new Error("Количество источников должно быть числом от 1 до 10");
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
	if (Number.isNaN(numValue) || numValue < 1 || numValue > 10) {
		throw new Error("Значение должно быть 'Не требуется' или число от 1 до 10");
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
			throw new Error(`Неизвестный канал внедрения: ${channel}`);
		}
		return total + coef;
	}, 0);
}
