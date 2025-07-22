export type ProbabilityLevel =
	| "Очень высокая"
	| "Высокая"
	| "Средняя"
	| "Низкая"
	| "Очень низкая"
	| "Не применимо";

export type InitiativeTimelineLevel =
	| "Неприемлемая"
	| "Высокая"
	| "Существенная"
	| "Средняя"
	| "Низкая"
	| "Не применимо";

export type InitiativeCostLevel =
	| "Неприемлемая"
	| "Высокая"
	| "Существенная"
	| "Средняя"
	| "Низкая"
	| "Не применимо";

export type InfluenceLevel =
	| "Неприемлемая"
	| "Высокая"
	| "Существенная"
	| "Средняя"
	| "Низкая"
	| "Не применимо";

export type ImpactAssessment = InitiativeTimelineLevel;
export type RiskLevelAssessment =
	| "Не применимо"
	| "Низкий"
	| "Средний"
	| "Высокий"
	| "Очень высокий";

// 1. Probability mapping
export function mapProbability(value: string): ProbabilityLevel {
	switch (value) {
		case "Реализация 1 раз в 6 мес. или чаще":
			return "Очень высокая";
		case "Реализация 1 раз в год":
			return "Высокая";
		case "Реализация 1 раз в 1-3 года":
			return "Средняя";
		case "Реализация 1 раз в 3-10 лет":
			return "Низкая";
		case "Реализация не чаще 1 раза в 10 лет":
			return "Очень низкая";
		default:
			return "Не применимо";
	}
}

// 2. InitiativeTimeline mapping
export function mapInitiativeTimeline(value: string): InitiativeTimelineLevel {
	switch (value) {
		case "Более 18 мес.":
			return "Неприемлемая";
		case "10-18 мес.":
			return "Высокая";
		case "4-10 мес.":
			return "Существенная";
		case "1-4 мес.":
			return "Средняя";
		case "Менее 1 мес.":
			return "Низкая";
		default:
			return "Не применимо";
	}
}

// 3. InitiativeCost mapping
export function mapInitiativeCost(value: string): InitiativeCostLevel {
	switch (value) {
		case "От 2 млрд.":
			return "Неприемлемая";
		case "870 млн. - 2 млрд.":
			return "Высокая";
		case "438-870 млн.":
			return "Существенная";
		case "45.3-438 млн.":
			return "Средняя";
		case "До 45.3 млн.":
			return "Низкая";
		default:
			return "Не применимо";
	}
}

// 4. Influence mapping
export function mapInfluence(value: string): InfluenceLevel {
	switch (value) {
		case "Критичное отклонение качества реализации проекта":
			return "Неприемлемая";
		case "Значительный негативный эффект на возможность достижения целей проекта":
			return "Высокая";
		case "Реализация проекта с контролируемыми отклонениями от изначальных целей":
			return "Существенная";
		case "Незначительное влияние на задачи и сроки достижения целей проекта":
			return "Средняя";
		case "Незначительное влияние на вторичные функции в рамках проектной деятельности":
			return "Низкая";
		default:
			return "Не применимо";
	}
}

// Step 1: Calculate impactAssessment
export function calculateImpactAssessment(
	initiativeTimeline: InitiativeTimelineLevel,
	initiativeCost: InitiativeCostLevel,
	influence: InfluenceLevel,
): ImpactAssessment {
	if (
		!initiativeTimeline ||
		!initiativeCost ||
		!influence ||
		initiativeTimeline === "Не применимо" ||
		initiativeCost === "Не применимо" ||
		influence === "Не применимо"
	) {
		return "Не применимо";
	}
	if (
		initiativeTimeline === "Неприемлемая" ||
		initiativeCost === "Неприемлемая" ||
		influence === "Неприемлемая"
	) {
		return "Неприемлемая";
	}
	if (
		initiativeTimeline === "Высокая" ||
		initiativeCost === "Высокая" ||
		influence === "Высокая"
	) {
		return "Высокая";
	}
	if (
		initiativeTimeline === "Существенная" ||
		initiativeCost === "Существенная" ||
		influence === "Существенная"
	) {
		return "Существенная";
	}
	if (
		initiativeTimeline === "Средняя" ||
		initiativeCost === "Средняя" ||
		influence === "Средняя"
	) {
		return "Средняя";
	}
	if (
		initiativeTimeline === "Низкая" ||
		initiativeCost === "Низкая" ||
		influence === "Низкая"
	) {
		return "Низкая";
	}
	return "Не применимо";
}

// Step 2: Calculate riskLevelAssessment
export function calculateRiskLevelAssessment(
	impactAssessment: ImpactAssessment,
	probability: ProbabilityLevel,
): RiskLevelAssessment {
	if (
		!impactAssessment ||
		!probability ||
		impactAssessment === "Не применимо" ||
		probability === "Не применимо"
	) {
		return "Не применимо";
	}
	// Неприемлемая
	if (impactAssessment === "Неприемлемая") {
		if (["Очень высокая", "Высокая", "Средняя"].includes(probability)) {
			return "Очень высокий";
		}
		if (probability === "Низкая") {
			return "Высокий";
		}
		if (probability === "Очень низкая") {
			return "Средний";
		}
	}
	// Высокая
	if (impactAssessment === "Высокая") {
		if (["Очень высокая", "Высокая"].includes(probability)) {
			return "Очень высокий";
		}
		if (["Средняя"].includes(probability)) {
			return "Высокий";
		}
		if (["Низкая", "Очень низкая"].includes(probability)) {
			return "Средний";
		}
	}
	// Существенная
	if (impactAssessment === "Существенная") {
		if (probability === "Очень высокая") {
			return "Очень высокий";
		}
		if (["Высокая", "Средняя"].includes(probability)) {
			return "Высокий";
		}
		if (probability === "Низкая") {
			return "Средний";
		}
		if (probability === "Очень низкая") {
			return "Низкий";
		}
	}
	// Средняя
	if (impactAssessment === "Средняя") {
		if (["Очень высокая", "Высокая"].includes(probability)) {
			return "Высокий";
		}
		if (probability === "Средняя") {
			return "Средний";
		}
		if (["Низкая", "Очень низкая"].includes(probability)) {
			return "Низкий";
		}
	}
	// Низкая
	if (impactAssessment === "Низкая") {
		if (["Очень высокая", "Высокая"].includes(probability)) {
			return "Средний";
		}
		if (["Средняя", "Низкая", "Очень низкая"].includes(probability)) {
			return "Низкий";
		}
	}
	return "Не применимо";
}

// Step 3: Map riskLevelAssessment to coefficient
export function mapRiskLevelToCoefficient(
	riskLevel: RiskLevelAssessment,
): number {
	switch (riskLevel) {
		case "Низкий":
			return 0.03;
		case "Средний":
			return 0.05;
		case "Высокий":
			return 0.07;
		case "Очень высокий":
			return 0.1;
		default:
			return 0.0;
	}
}

// Step 4: Calculate coefficient for one general uncertainty item
export interface GeneralUncertaintyInput {
	initiativeTimeline: string;
	initiativeCost: string;
	influence: string;
	probability: string;
}

export function calculateGeneralUncertaintyCoefficientForItem(
	item: GeneralUncertaintyInput,
): number {
	const timelineLevel = mapInitiativeTimeline(item.initiativeTimeline);
	const costLevel = mapInitiativeCost(item.initiativeCost);
	const influenceLevel = mapInfluence(item.influence);
	const probabilityLevel = mapProbability(item.probability);

	const impactAssessment = calculateImpactAssessment(
		timelineLevel,
		costLevel,
		influenceLevel,
	);
	const riskLevel = calculateRiskLevelAssessment(
		impactAssessment,
		probabilityLevel,
	);
	return mapRiskLevelToCoefficient(riskLevel);
}

// Step 5: Calculate total coefficient for array of items
export function calculateTotalGeneralUncertaintyCoefficient(
	items: GeneralUncertaintyInput[],
): number {
	return items.reduce(
		(sum, item) => sum + calculateGeneralUncertaintyCoefficientForItem(item),
		0,
	);
}
