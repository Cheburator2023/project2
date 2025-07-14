import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuestionnaireSchema1718651234568
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Создание таблицы элементов опросника
		await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS questionnaire_item
            (
                "id"          uuid PRIMARY KEY      DEFAULT uuid_generate_v4(),
                "name"        varchar(255) NOT NULL,
                "code"        varchar(50)  NOT NULL UNIQUE,
                "description" text,
                "isRequired"  boolean      NOT NULL DEFAULT false,
                "isActive"    boolean      NOT NULL DEFAULT true,
                "fieldType"   varchar(50)  NOT NULL CHECK ("fieldType" IN
                                                           ('number', 'text', 'select', 'multiselect', 'boolean',
                                                            'risk')),
                "options"     jsonb,
                "order"       integer,
                "createdAt"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

		// 2. Создание таблицы коэффициентов
		await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS coefficient
            (
                "id"          uuid PRIMARY KEY      DEFAULT uuid_generate_v4(),
                "name"        varchar(255) NOT NULL,
                "code"        varchar(100) NOT NULL UNIQUE,
                "baseValue"   float        NOT NULL,
                "isActive"    boolean      NOT NULL DEFAULT true,
                "conditions"  jsonb,
                "description" text,
                "createdAt"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

		// 3. Создание таблицы средних значений по стримам
		await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS stream_average
            (
                "id"           uuid PRIMARY KEY      DEFAULT uuid_generate_v4(),
                "epicName"     varchar(100) NOT NULL UNIQUE,
                "averageValue" float        NOT NULL,
                "description"  text,
                "createdAt"    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt"    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

		// // 4. Создание таблицы artefact_values
		// await queryRunner.query(`
		//     CREATE TABLE IF NOT EXISTS artefact_values
		//     (
		//         "artefact_value_id"       numeric(38) PRIMARY KEY,
		//         "artefact_id"             numeric(38) NOT NULL,
		//         "artefact_value"         varchar(4000) NOT NULL,
		//         "artefact_value_label"    varchar(4000),
		//         "is_active_flg"           varchar(1) DEFAULT '1',
		//         "artefact_parent_value_id" numeric(38)
		//         );
		// `);

		// 5. Заполнение таблицы элементов опросника тестовыми данными
		await queryRunner.query(`
            INSERT INTO questionnaire_item
            (id, name, code, description, "isRequired", "fieldType", options, "order")
            VALUES (uuid_generate_v4(), 'Количество моделей', 'modelsCount',
                    'Количество моделей (>1 для каскадов и ансамблей моделей)', true, 'number', null, 1),

                   (uuid_generate_v4(), 'Сложность постановки', 'setupComplexity', 'Сложность постановки задачи', true,
                    'select',
                    '[{"value": 1, "label": "Уровень 1", "hint": "Проведение регулярной валидации Моделей Регулятором не установлено"}, 
                      {"value": 2, "label": "Уровень 2", "hint": "Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска"}, 
                      {"value": 3, "label": "Уровень 3", "hint": "Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели"}, 
                      {"value": 4, "label": "Уровень 4", "hint": "Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором"}, 
                      {"value": 5, "label": "Уровень 5", "hint": "Банком планируется предоставление Модели Регулятору для одобрения к использованию"}]',
                    2),

                   (uuid_generate_v4(), 'Сроки инициативы', 'initiativeTimeline', 'Срок реализации инициативы', true,
                    'select',
                    '[{"value": "Менее 1 мес.", "hint": "Краткосрочные проекты"}, 
                      {"value": "1-4 мес.", "hint": "Среднесрочные проекты"}, 
                      {"value": "4-10 мес.", "hint": "Долгосрочные проекты"}, 
                      {"value": "10-18 мес.", "hint": "Стратегические инициативы"}, 
                      {"value": "Более 18 мес.", "hint": "Трансформационные программы"}]',
                    3),

                   (uuid_generate_v4(), 'Стоимость инициативы', 'initiativeCost', 'Стоимость инициативы', true,
                    'select',
                    '[{"value": "До 45.3 млн.", "hint": "Малые проекты"}, 
                      {"value": "45.3-438 млн.", "hint": "Средние проекты"}, 
                      {"value": "438-870 млн.", "hint": "Крупные проекты"}, 
                      {"value": "870 млн. - 2 млрд.", "hint": "Значительные инициативы"}, 
                      {"value": "От 2 млрд.", "hint": "Мегапроекты"}]',
                    4),

                   (uuid_generate_v4(), 'Общая неопределенность', 'generalUncertainty',
                    'Суммарная оценка неопределенностей (5.1-5.11)', true, 'risk',
                    '[{"value": "5.1", "label": "Изменение бизнес-процессов", "hint": "Риски изменения бизнес-процессов Банка"}, 
                      {"value": "5.2", "label": "Дефекты во внедряемом ПО", "hint": "Риски наличия дефектов в ПО"}, 
                      {"value": "5.3", "label": "Недостатки коммуникаций", "hint": "Риски недостатков коммуникаций"}, 
                      {"value": "5.4", "label": "Увеличение трудозатрат", "hint": "Риски увеличения трудозатрат"}, 
                      {"value": "5.5", "label": "Недобросовестные подрядчики", "hint": "Риски работы с подрядчиками"}, 
                      {"value": "5.6", "label": "Отсутствие персонала", "hint": "Риски нехватки квалифицированного персонала"}, 
                      {"value": "5.7", "label": "Санкционные меры", "hint": "Риски санкционных ограничений"}, 
                      {"value": "5.8", "label": "Отсутствие контроля", "hint": "Риски недостатка контрольных процедур"}, 
                      {"value": "5.9", "label": "Изменение регуляторных требований", "hint": "Риски изменения регуляторики"}, 
                      {"value": "5.10", "label": "Неиспользование ИС", "hint": "Риски неиспользования ИС после проекта"}, 
                      {"value": "5.11", "label": "Изменение ИТ архитектуры", "hint": "Риски изменения целевой архитектуры"}]',
                    5),

                   (uuid_generate_v4(), 'Наличие готовых пром витрин', 'readyPromReports',
                    'Наличие готовых промоделированных отчетов', true, 'select',
                    '[{"value": "Да", "hint": "Готовые пром-витрины доступны"}, 
                      {"value": "Нет", "hint": "Требуется разработка пром-витрин"}]',
                    6),

                   (uuid_generate_v4(), 'Тип алгоритма', 'algorithmType', 'Тип используемого алгоритма', true,
                    'multiselect',
                    '[{"value": "Табличные данные", "hint": "Работа с структурированными табличными данными"}, 
                      {"value": "Текстовая аналитика_Классические модели", "hint": "Классические методы обработки текста (TF-IDF, Word2Vec)"}, 
                      {"value": "Текстовая аналитика_LLM", "hint": "Использование больших языковых моделей"}, 
                      {"value": "Аудио Аналитика", "hint": "Обработка и анализ аудиоданных"}, 
                      {"value": "Компьютерное зрение_CV", "hint": "Анализ изображений и видео"}, 
                      {"value": "Оптимизационная задача", "hint": "Решение оптимизационных задач"}, 
                      {"value": "Гео-аналитика", "hint": "Анализ геопространственных данных"}, 
                      {"value": "Графовая аналитика", "hint": "Работа с графовыми структурами данных"}]',
                    7),

                   (uuid_generate_v4(), 'Необходимость поддержки проведения пилота', 'pilotSupportRequired',
                    'Требуется ли поддержка проведения пилота', true, 'select',
                    '[{"value": "Да", "hint": "Требуется поддержка проведения пилотного внедрения"}, 
                      {"value": "Не требуется", "hint": "Поддержка пилота не требуется"}]',
                    8),

                   (uuid_generate_v4(), 'Необходимость AutoML', 'autoMLRequired', 'Требуется ли использование AutoML',
                    true, 'select',
                    '[{"value": "Да", "hint": "Требуется использование AutoML"}, 
                      {"value": "Не требуется", "hint": "Использование AutoML не требуется"}]',
                    9),
                
                   (uuid_generate_v4(), 'Количество инициатив', 'initiativesCount', 'Количество оцениваемых инициатив',
                    true, 'number', null, 10),

                   (uuid_generate_v4(), 'Пилотная модель', 'pilotModelRequired',
                    'Необходимость реализации пилотной модели', true, 'select',
                    '[{"value": "Да", "hint": "Требуется разработка пилотной модели"}, 
                      {"value": "Нет", "hint": "Пилотная модель не требуется"}]', 11)
        `);

		// 6. Заполнение таблицы коэффициентов тестовыми данными
		await queryRunner.query(`
            INSERT INTO coefficient
                (id, name, code, "baseValue", conditions, description)
            VALUES (uuid_generate_v4(), 'Коэффициент количества моделей', 'modelsCount', 1.0,
                    '{"default": 1, "formula": "1 + (value - 1) * 0.75"}', 'Коэффициент для учета количества моделей'),

                   (uuid_generate_v4(), 'Коэффициент сложности постановки (Уровень 1)', 'setupComplexity_1', 1.0, null,
                    'Проведение регулярной валидации Моделей Регулятором не установлено'),
                   (uuid_generate_v4(), 'Коэффициент сложности постановки (Уровень 2)', 'setupComplexity_2', 1.25, null,
                    'Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска'),
                   (uuid_generate_v4(), 'Коэффициент сложности постановки (Уровень 3)', 'setupComplexity_3', 1.5, null,
                    'Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели'),
                   (uuid_generate_v4(), 'Коэффициент сложности постановки (Уровень 4)', 'setupComplexity_4', 1.75, null,
                    'Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором'),
                   (uuid_generate_v4(), 'Коэффициент сложности постановки (Уровень 5)', 'setupComplexity_5', 2.0, null,
                    'Банком планируется предоставление Модели Регулятору для одобрения к использованию'),

                   (uuid_generate_v4(), 'Коэффициент срока инициативы (Менее 1 мес.)',
                    'initiativeTimeline_Менее 1 мес.', 0.8, null, 'Краткосрочные проекты'),
                   (uuid_generate_v4(), 'Коэффициент срока инициативы (1-4 мес.)', 'initiativeTimeline_1-4 мес.', 1.0,
                    null, 'Среднесрочные проекты'),
                   (uuid_generate_v4(), 'Коэффициент срока инициативы (4-10 мес.)', 'initiativeTimeline_4-10 мес.', 1.2,
                    null, 'Долгосрочные проекты'),
                   (uuid_generate_v4(), 'Коэффициент срока инициативы (10-18 мес.)', 'initiativeTimeline_10-18 мес.',
                    1.5, null, 'Стратегические инициативы'),
                   (uuid_generate_v4(), 'Коэффициент срока инициативы (Более 18 мес.)',
                    'initiativeTimeline_Более 18 мес.', 2.0, null, 'Трансформационные программы'),

                   (uuid_generate_v4(), 'Коэффициент стоимости инициативы (До 45.3 млн.)',
                    'initiativeCost_До 45.3 млн.', 0.8, null, 'Малые проекты'),
                   (uuid_generate_v4(), 'Коэффициент стоимости инициативы (45.3-438 млн.)',
                    'initiativeCost_45.3-438 млн.', 1.0, null, 'Средние проекты'),
                   (uuid_generate_v4(), 'Коэффициент стоимости инициативы (438-870 млн.)',
                    'initiativeCost_438-870 млн.', 1.2, null, 'Крупные проекты'),
                   (uuid_generate_v4(), 'Коэффициент стоимости инициативы (870 млн. - 2 млрд.)',
                    'initiativeCost_870 млн. - 2 млрд.', 1.5, null, 'Значительные инициативы'),
                   (uuid_generate_v4(), 'Коэффициент стоимости инициативы (От 2 млрд.)', 'initiativeCost_От 2 млрд.',
                    2.0, null, 'Мегапроекты'),

                   (uuid_generate_v4(), 'Коэффициент готовых пром витрин (Да)', 'readyPromReports_Да', 0.5, null,
                    'Готовые пром-витрины доступны'),
                   (uuid_generate_v4(), 'Коэффициент готовых пром витрин (Нет)', 'readyPromReports_Нет', 1.0, null,
                    'Требуется разработка пром-витрин'),

                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Табличные данные)',
                    'algorithmType_Табличные данные', 0.75, null, 'Работа с структурированными табличными данными'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Текстовая аналитика_Классические модели)',
                    'algorithmType_Текстовая аналитика_Классические модели', 1.25, null,
                    'Классические методы обработки текста (TF-IDF, Word2Vec)'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Текстовая аналитика_LLM)',
                    'algorithmType_Текстовая аналитика_LLM', 1.4, null, 'Использование больших языковых моделей'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Аудио Аналитика)', 'algorithmType_Аудио Аналитика',
                    1.6, null, 'Обработка и анализ аудиоданных'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Компьютерное зрение_CV)',
                    'algorithmType_Компьютерное зрение_CV', 1.8, null, 'Анализ изображений и видео'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Оптимизационная задача)',
                    'algorithmType_Оптимизационная задача', 2.5, null, 'Решение оптимизационных задач'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Гео-аналитика)', 'algorithmType_Гео-аналитика',
                    3.0, null, 'Анализ геопространственных данных'),
                   (uuid_generate_v4(), 'Коэффициент типа алгоритма (Графовая аналитика)',
                    'algorithmType_Графовая аналитика', 3.5, null, 'Работа с графовыми структурами данных'),

                   (uuid_generate_v4(), 'Коэффициент поддержки пилота (Да)', 'pilotSupportRequired_Да', 1.0, null,
                    'Требуется поддержка проведения пилотного внедрения'),
                   (uuid_generate_v4(), 'Коэффициент поддержки пилота (Не требуется)',
                    'pilotSupportRequired_Не требуется', 0.0, null, 'Поддержка пилота не требуется'),

                   (uuid_generate_v4(), 'Коэффициент AutoML (Да)', 'autoMLRequired_Да', 1.0, null,
                    'Требуется использование AutoML'),
                   (uuid_generate_v4(), 'Коэффициент AutoML (Не требуется)', 'autoMLRequired_Не требуется', 0.0, null,
                    'Использование AutoML не требуется'),

                   (uuid_generate_v4(), 'Коэффициент риска 5.1', 'risk_5_1', 0.1,
                    '{"conditions": [{"field": "initiativeTimeline", "value": "Более 18 мес."}, {"field": "initiativeCost", "value": "От 2 млрд."}]}',
                    'Коэффициент для риска изменения бизнес-процессов'),

                   (uuid_generate_v4(), 'Коэффициент риска 5.2', 'risk_5_2', 0.07,
                    '{"conditions": [{"field": "initiativeTimeline", "value": "10-18 мес."}, {"field": "initiativeCost", "value": "870 млн. - 2 млрд."}]}',
                    'Коэффициент для риска дефектов во внедряемом ПО'),

                   (uuid_generate_v4(), 'Коэффициент риска 5.3', 'risk_5_3', 0.05,
                    '{"conditions": [{"field": "initiativeTimeline", "value": "4-10 мес."}]}',
                    'Коэффициент для недостатков коммуникаций'),

                   (uuid_generate_v4(), 'Коэффициент риска 5.4', 'risk_5_4', 0.04,
                    '{"conditions": [{"field": "initiativeCost", "value": "438-870 млн."}]}',
                    'Коэффициент для увеличения трудозатрат');
        `);

		// 7. Заполнение таблицы средних значений по стримам тестовыми данными
		await queryRunner.query(`
            INSERT INTO stream_average
                (id, "epicName", "averageValue", description)
            VALUES (uuid_generate_v4(), '01. Постановка задачи', 15.5, 'Этап постановки задачи'),
                   (uuid_generate_v4(), '02. Поиск данных', 20.0, 'Этап поиска и сбора данных'),
                   (uuid_generate_v4(), '03. Построение витрины для разработки', 25.0,
                    'Создание витрин данных для разработки'),
                   (uuid_generate_v4(), '05А. Разработка пилотной модели (MVP)', 40.0,
                    'Разработка минимально жизнеспособного продукта'),
                   (uuid_generate_v4(), '05. Разработка модели', 37.0, 'Основной этап разработки модели'),
                   (uuid_generate_v4(), 'AML Разработка', 68.0, 'Разработка AML компонентов'),
                   (uuid_generate_v4(), '05В. Пилотирование модели', 34.0, 'Этап пилотного внедрения'),
                   (uuid_generate_v4(), '07. Разработка витрины для применения модели', 56.0,
                    'Создание витрин для эксплуатации'),
                   (uuid_generate_v4(), '09. Адаптация и внедрение модели', 50.0, 'Финальное внедрение модели'),
                   (uuid_generate_v4(), 'AML Внедрение', 68.0, 'Внедрение AML компонентов');
        `);

		// // 8. Заполнение таблицы artefact_values тестовыми данными
		// await queryRunner.query(`
		//     INSERT INTO artefact_values (
		//         artefact_value_id,
		//         artefact_id,
		//         artefact_value,
		//         artefact_value_label,
		//         is_active_flg,
		//         artefact_parent_value_id
		//     )
		//     VALUES
		//         (248, 6, 'Депозитарий', 'bc_dep12', '1', NULL),
		//         (283, 6, 'Департамент операционной поддержки бизнеса', 'bc_dep47', '1', NULL),
		//         (284, 6, 'Департамент по работе с персоналом', 'bc_dep48', '1', NULL),
		//         (285, 6, 'Департамент по работе со СМИ', 'bc_dep49', '1', NULL),
		//         (286, 6, 'Департамент корпоративных кредитных рисков', 'bc_dep50', '1', NULL),
		//         (571, 6, 'Департамент по работе с массовым сегментом', 'bc_dep73', '1', NULL),
		//         (298, 6, 'Специальный отдел', 'bc_dep62', '1', NULL),
		//         (237, 6, 'Департамент брокерского обслуживания', 'bc_dep1', '1', NULL),
		//         (238, 6, 'Департамент инвестиционных продуктов', 'bc_dep2', '1', NULL),
		//         (239, 6, 'Департамент координации и анализа бизнеса', 'bc_dep3', '1', NULL),
		//         (240, 6, 'Департамент операций на рынке акций', 'bc_dep4', '1', NULL),
		//         (241, 6, 'Департамент по работе с клиентами базовых отраслей', 'bc_dep5', '1', NULL),
		//         (244, 6, 'Кредитный департамент', 'bc_dep8', '1', NULL),
		//         (760, 6, 'Департамент розничных кредитных рисков_Управление методологии', 'Департамент розничных кредитных рисков _Управление методологии', '1', NULL),
		//         (815, 6, 'Тестовый департамент map', 'Тестовый департамент map', '1', NULL),
		//         (768, 6, 'Казначейство', 'Казначейство', '1', NULL),
		//         (303, 6, 'Департамент технологического развития розничного бизнеса', 'bc_dep67', '1', NULL),
		//         (701, 7, 'Моделирование РБ', 'Моделирование РБ', '1', NULL),
		//         (702, 7, 'Разработка моделей для КМБ и КСБ', 'Разработка моделей для КМБ и КСБ', '1', NULL),
		//         (703, 7, 'Моделирование RnD', 'Моделирование RnD', '1', NULL),
		//         (704, 7, 'Финансовое моделирование', 'Финансовое моделирование', '1', NULL)
		//     ON CONFLICT (artefact_value_id) DO NOTHING;
		// `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS stream_average`);
		await queryRunner.query(`DROP TABLE IF EXISTS coefficient`);
		await queryRunner.query(`DROP TABLE IF EXISTS questionnaire_item`);
		// await queryRunner.query(`DROP TABLE IF EXISTS artefact_values`);
	}
}
