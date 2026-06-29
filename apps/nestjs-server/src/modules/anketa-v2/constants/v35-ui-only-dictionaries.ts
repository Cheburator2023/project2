import type { V2DefaultDictionaryDef } from "../utils/v2-schema-dictionary.util";
import { schemaDictionaryItemCode } from "../utils/v2-schema-dictionary.util";

function uiOnlyDictionary(
	code: string,
	name: string,
	labels: readonly string[],
): V2DefaultDictionaryDef {
	const seen = new Set<string>();
	return {
		code,
		name,
		description: "Заводской справочник v35 (поле string/select без enum в jsonSchema)",
		category: "Схема",
		items: labels.map((label, order) => ({
			code: schemaDictionaryItemCode(label, order, seen),
			label,
			order,
		})),
	};
}

/** Справочники v35, привязанные в uiSchema, но без enum в jsonSchema. */
export const V35_UI_ONLY_DICTIONARIES: V2DefaultDictionaryDef[] = [
	uiOnlyDictionary(
		"v2.detailInfo.sourceSystems.items.field_wuYlhnu0",
		"Сложность настройки шаблона разметки данных",
		["Высокая", "Средняя", "Низкая", "Неизвестно"],
	),
	uiOnlyDictionary(
		"v2.dataObjects.applicationSources.items.development",
		"Доработка",
		["Не нужна", "С нуля", "Нужна"],
	),
	uiOnlyDictionary(
		"v2.modelserviceiInfo.bidbtype",
		"Тип БД для BI-системы",
		[
			"Векторные",
			"Графовые",
			"Временные ряды и события",
			"Документо-ориентированные",
			"Специализированные",
		],
	),
	uiOnlyDictionary(
		"v2.streamDataSources.localParams.reapproveArtifact",
		"Необходимо пересогласование артефакта",
		["Да", "Нет", "Неизвестно"],
	),
	uiOnlyDictionary(
		"v2.streamDataSources.localParams.stakeholdersKnown",
		"Стейкхолдеры известны (владелец сервиса, разработчик модели / витрин, РП и тд.)?",
		["Да", "Нет", "Неизвестны"],
	),
	uiOnlyDictionary(
		"v2.streamDataSources.localParams.studyRegulations",
		"Необходимость изучения регламентов Банка",
		["Да", "Нет", "Неизвестно"],
	),
	uiOnlyDictionary(
		"v2.streamDataSources.localParams.tisChangeVolume",
		"Объем изменений в ТИС",
		[
			"Неизвестно",
			"Точечное (1-4)",
			"Малое (5-9)",
			"Среднее (9-15)",
			"Крупное (15-20)",
			"Большое (20-25)",
			"Масштабное (25+)",
		],
	),
	uiOnlyDictionary(
		"v2.streamModelControl.localParams.field_EhLyopSI",
		"Разнородность пользовательских сценариев применения модельного сервиса",
		["Нет", "Единая структура логов", "Разные структуры логов"],
	),
];
