"use strict";
/** Canonical dictionary literals shared by Nest DTO validation and frontend typing. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNCERTAINTY_TYPE_NAMES = exports.UNCERTAINTY_TYPE_VALUES = exports.DATA_SOURCES_COUNT_VALUES = exports.DEPLOYMENT_CHANNEL_VALUES = exports.ALGORITHM_TYPE_VALUES = exports.YES_NO_REQUIRED_VALUES = exports.YES_NO_VALUES = exports.INFLUENCE_VALUES = exports.PROBABILITY_VALUES = exports.INITIATIVE_COST_VALUES = exports.INITIATIVE_TIMELINE_VALUES = exports.SETUP_COMPLEXITY_VALUES = void 0;
exports.SETUP_COMPLEXITY_VALUES = [
    "1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
    "2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска",
    "3 Сложность: Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели",
    "4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором",
    "5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию",
];
exports.INITIATIVE_TIMELINE_VALUES = [
    "Менее 1 мес.",
    "1-4 мес.",
    "4-10 мес.",
    "10-18 мес.",
    "Более 18 мес.",
];
exports.INITIATIVE_COST_VALUES = [
    "До 45.3 млн.",
    "45.3-438 млн.",
    "438-870 млн.",
    "870 млн. - 2 млрд.",
    "От 2 млрд.",
];
exports.PROBABILITY_VALUES = [
    "Реализация не чаще 1 раза в 10 лет",
    "Реализация 1 раз в 3-10 лет",
    "Реализация 1 раз в 1-3 года",
    "Реализация 1 раз в год",
    "Реализация 1 раз в 6 мес. или чаще",
];
exports.INFLUENCE_VALUES = [
    "Незначительное влияние на вторичные функции в рамках проектной деятельности",
    "Незначительное влияние на задачи и сроки достижения целей проекта",
    "Реализация проекта с контролируемыми отклонениями от изначальных целей",
    "Значительный негативный эффект на возможность достижения целей проекта",
    "Критичное отклонение качества реализации проекта",
];
exports.YES_NO_VALUES = ["Да", "Нет"];
exports.YES_NO_REQUIRED_VALUES = ["Да", "Не требуется"];
exports.ALGORITHM_TYPE_VALUES = [
    "Табличные данные",
    "Текстовая аналитика_Классические модели",
    "Текстовая аналитика_LLM",
    "Аудио Аналитика",
    "Компьютерное зрение_CV",
    "Оптимизационная задача",
    "Гео-аналитика",
    "Графовая аналитика",
];
exports.DEPLOYMENT_CHANNEL_VALUES = [
    "Батч",
    "Батч+загрузка данных потребителю",
    "Батч + Онлайн",
    "Онлайн",
    "Онлайн gpu",
    "Стриминг",
    "Мобильные устройства",
    "LLM",
    "Гео-сервисы",
    "Внедрение в облаке",
    "Графовая платформа",
];
exports.DATA_SOURCES_COUNT_VALUES = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
];
exports.UNCERTAINTY_TYPE_VALUES = [
    "businessProcessComplexity",
    "projectSolutionDefects",
    "adjacentProjectsImpact",
    "planningRequirementGaps",
    "contractorPerformanceIssues",
    "qualifiedStaffShortage",
    "sanctionsRisk",
    "controlProceduresGaps",
    "regulatoryChanges",
    "systemUnderutilization",
    "itArchitectureChanges",
];
exports.UNCERTAINTY_TYPE_NAMES = {
    businessProcessComplexity: "Изменение, недостаточная проработка или сложности бизнес-процессов Банка",
    projectSolutionDefects: "Наличие дефектов во внедряемом решении/ПО в рамках проекта",
    adjacentProjectsImpact: "Негативное влияние смежных проектов на показатели проекта",
    planningRequirementGaps: "Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
    contractorPerformanceIssues: "Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков",
    qualifiedStaffShortage: "Отсутствие квалифицированного персонала или ошибок персонала",
    sanctionsRisk: "Введение санкционных мер и других ограничений",
    controlProceduresGaps: "Недостаток или отсутствие контрольных процедур",
    regulatoryChanges: "Изменение регуляторных требований",
    systemUnderutilization: "Неиспользование ИС после завершения проекта",
    itArchitectureChanges: "Изменение целевой ИТ архитектуры Банка",
};
