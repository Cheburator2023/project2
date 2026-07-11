/**
 * Нормализация арх. компонента для строк каталога без «Арх. Компонент» в работы.csv.
 * Этап 220 — сквозные работы реализации решения (объект данных),
 * этап 230 — сопровождение/мониторинг источника (система-источник).
 */
export function inferMissingCatalogComponent(
	rawComponent: string,
	stream: string,
	stage: string,
): string {
	const component = rawComponent.trim();
	if (component && !component.endsWith("?")) {
		return component;
	}

	const streamNorm = stream.trim();
	const stageNorm = stage.trim();

	if (streamNorm.includes("Контроль моделей")) {
		return "Модельный сервис";
	}

	if (stageNorm === "Этап 230" || stageNorm === "Этап 219") {
		return "Система-источник";
	}

	if (stageNorm === "Этап 220") {
		return "Объект/Витрина данных";
	}

	return component;
}
