/** Canonical dictionary literals shared by Nest DTO validation and frontend typing. */
export declare const SETUP_COMPLEXITY_VALUES: readonly ["1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено", "2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска", "3 Сложность: Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели", "4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором", "5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию"];
export declare const INITIATIVE_TIMELINE_VALUES: readonly ["Менее 1 мес.", "1-4 мес.", "4-10 мес.", "10-18 мес.", "Более 18 мес."];
export declare const INITIATIVE_COST_VALUES: readonly ["До 45.3 млн.", "45.3-438 млн.", "438-870 млн.", "870 млн. - 2 млрд.", "От 2 млрд."];
export declare const PROBABILITY_VALUES: readonly ["Реализация не чаще 1 раза в 10 лет", "Реализация 1 раз в 3-10 лет", "Реализация 1 раз в 1-3 года", "Реализация 1 раз в год", "Реализация 1 раз в 6 мес. или чаще"];
export declare const INFLUENCE_VALUES: readonly ["Незначительное влияние на вторичные функции в рамках проектной деятельности", "Незначительное влияние на задачи и сроки достижения целей проекта", "Реализация проекта с контролируемыми отклонениями от изначальных целей", "Значительный негативный эффект на возможность достижения целей проекта", "Критичное отклонение качества реализации проекта"];
export declare const YES_NO_VALUES: readonly ["Да", "Нет"];
export declare const YES_NO_REQUIRED_VALUES: readonly ["Да", "Не требуется"];
export declare const ALGORITHM_TYPE_VALUES: readonly ["Табличные данные", "Текстовая аналитика_Классические модели", "Текстовая аналитика_LLM", "Аудио Аналитика", "Компьютерное зрение_CV", "Оптимизационная задача", "Гео-аналитика", "Графовая аналитика"];
export declare const DEPLOYMENT_CHANNEL_VALUES: readonly ["Батч", "Батч+загрузка данных потребителю", "Батч + Онлайн", "Онлайн", "Онлайн gpu", "Стриминг", "Мобильные устройства", "LLM", "Гео-сервисы", "Внедрение в облаке", "Графовая платформа"];
export declare const DATA_SOURCES_COUNT_VALUES: readonly ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
export declare const UNCERTAINTY_TYPE_VALUES: readonly ["businessProcessComplexity", "projectSolutionDefects", "adjacentProjectsImpact", "planningRequirementGaps", "contractorPerformanceIssues", "qualifiedStaffShortage", "sanctionsRisk", "controlProceduresGaps", "regulatoryChanges", "systemUnderutilization", "itArchitectureChanges"];
export declare const UNCERTAINTY_TYPE_NAMES: {
    readonly businessProcessComplexity: "Изменение, недостаточная проработка или сложности бизнес-процессов Банка";
    readonly projectSolutionDefects: "Наличие дефектов во внедряемом решении/ПО в рамках проекта";
    readonly adjacentProjectsImpact: "Негативное влияние смежных проектов на показатели проекта";
    readonly planningRequirementGaps: "Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта";
    readonly contractorPerformanceIssues: "Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков";
    readonly qualifiedStaffShortage: "Отсутствие квалифицированного персонала или ошибок персонала";
    readonly sanctionsRisk: "Введение санкционных мер и других ограничений";
    readonly controlProceduresGaps: "Недостаток или отсутствие контрольных процедур";
    readonly regulatoryChanges: "Изменение регуляторных требований";
    readonly systemUnderutilization: "Неиспользование ИС после завершения проекта";
    readonly itArchitectureChanges: "Изменение целевой ИТ архитектуры Банка";
};
