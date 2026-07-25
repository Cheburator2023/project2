# Тестовые пользователи Keycloak (ролёвка F-05)

Источник: `apps/nestjs-server/src/modules/anketa-v2/constants/v2-keycloak-test-users.ts`.

Пароль для новых пользователей = **username**.

Всего: **61**.

| username | роль |
|---|---|
| `test_ds` | DS (все модельные стримы) |
| `test_ds_lead` | Руководитель DS |
| `test_sum_ds_kmbkcb` | DS · КМБ и КСБ / КИБ и СМБ |
| `test_sum_ds_ptitpc` | DS · AI-модели партнерств |
| `test_sum_ds_rnd` | DS · Моделирование RnD |
| `test_sum_ds_rb` | DS · Моделирование РБ |
| `test_sum_ds_finmdl` | DS · Финансовое моделирование |
| `test_de` | DE (все модельные департаменты) |
| `test_de_lead` | Руководитель DE |
| `test_sum_de_kmbkcb` | DE · КМБ и КСБ / КИБ и СМБ |
| `test_sum_de_ptitpc` | DE · AI-модели партнерств |
| `test_sum_de_rnd` | DE · Моделирование RnD |
| `test_sum_de_rb` | DE · Моделирование РБ |
| `test_sum_de_finmdl` | DE · Финансовое моделирование |
| `test_de_kib` | DE · только КИБ и СМБ (alias test_sum_de_kmbkcb) |
| `test_de_rb` | DE · только РБ (alias test_sum_de_rb) |
| `test_de_fin` | DE · только процессные/финансовые (alias test_sum_de_finmdl) |
| `test_modelops` | ModelOps (все модельные стримы) |
| `test_modelops_lead` | Руководитель ModelOps |
| `test_sum_mo_kmbkcb` | ModelOps · КМБ и КСБ / КИБ и СМБ |
| `test_sum_mo_ptitpc` | ModelOps · AI-модели партнерств |
| `test_sum_mo_rnd` | ModelOps · Моделирование RnD |
| `test_sum_mo_rb` | ModelOps · Моделирование РБ |
| `test_sum_mo_finmdl` | ModelOps · Финансовое моделирование |
| `test_mipm` | Бизнес-партнёр |
| `test_mipm_sa` | Бизнес-партнёр стрима · КМБ и КСБ |
| `test_sum_mipm_kmbkcb` | Бизнес-партнёр стрима · КМБ и КСБ / КИБ и СМБ |
| `test_sum_mipm_ptitpc` | Бизнес-партнёр стрима · AI-модели партнерств |
| `test_sum_mipm_rnd` | Бизнес-партнёр стрима · Моделирование RnD |
| `test_sum_mipm_rb` | Бизнес-партнёр стрима · Моделирование РБ |
| `test_sum_mipm_finmdl` | Бизнес-партнёр стрима · Финансовое моделирование |
| `test_validator` | Валидатор |
| `test_validator_lead` | Руководитель валидации |
| `test_sum_arch_kmbkcb` | Архитектор данных ML · КМБ и КСБ / КИБ и СМБ |
| `test_sum_arch_ptitpc` | Архитектор данных ML · AI-модели партнерств |
| `test_sum_arch_rnd` | Архитектор данных ML · Моделирование RnD |
| `test_sum_arch_rb` | Архитектор данных ML · Моделирование РБ |
| `test_sum_arch_finmdl` | Архитектор данных ML · Финансовое моделирование |
| `test_architect` | Архитектор данных ML (все стримы) |
| `test_sum_mntranlst` | Аналитик качества работы моделей ДАДМ |
| `test_sum_da` | Аналитик качества модельных данных |
| `test_sum_da_kmbkcb` | Аналитик качества модельных данных стрима · КМБ и КСБ / КИБ и СМБ |
| `test_sum_da_ptitpc` | Аналитик качества модельных данных стрима · AI-модели партнерств |
| `test_sum_da_rnd` | Аналитик качества модельных данных стрима · Моделирование RnD |
| `test_sum_da_rb` | Аналитик качества модельных данных стрима · Моделирование РБ |
| `test_sum_da_finmdl` | Аналитик качества модельных данных стрима · Финансовое моделирование |
| `test_sum_da_stream` | Аналитик качества модельных данных стрима (alias test_sum_da_kmbkcb) |
| `test_sum_appadmin` | Прикладной администратор |
| `test_sum_auditorib` | Аудитор ИБ |
| `test_auditor` | Аудитор |
| `test_sum_saprg` | Руководитель программ ДАДМ |
| `test_sum_sacfg` | Конфигуратор Смарт-Анкеты |
| `test_sum_sarep` | Представитель стрима — не участника ЖЦМ |
| `test_business_customer` | Бизнес-заказчик |
| `test_prjtoffice` | Сотрудник проектного офиса |
| `test_sum_sarep_idsrc` | Представитель стрима · Источники данных |
| `test_sum_sarep_mdlctl` | Представитель стрима · Контроль моделей |
| `test_sum_sarep_pirm` | Представитель стрима · Платформы и Решения для моделирования |
| `test_sum_sarep_strdat` | Представитель стрима · Потоковые данные |
| `test_sum_sarep_digagt` | Представитель стрима · Цифровые агенты |
| `test_sum_sarep_dadm` | Представитель стрима · ДАДМ |
