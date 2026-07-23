# Тестовые пользователи SUMD ↔ матрица ролей

Источник ролей: `требования_матрица_ролей.csv`  
Keycloak: `https://keycloak-sumd.sumd.dk1-sumd01.innodev.local/auth` · realm `cym`  
Пароль у всех `test_*`: **равен логину**.

| Роль (матрица) | Логин SUMD | Группы Keycloak | Статус |
|---|---|---|---|
| DS | `test_ds` | `/ds` (+ департаменты стримов) | был |
| Руководитель DS | `test_ds_lead` | `/ds`, `/ds/ds_lead` | был |
| DE | `test_de` | `/de` | был |
| Руководитель DE | `test_de_lead` | `/de`, `/de/de_lead` | был |
| ModelOps | `test_modelops` | `/modelops` | был |
| Руководитель ModelOps | `test_modelops_lead` | `/modelops`, `/modelops/modelops_lead` | был |
| Бизнес-партнёр | `test_mipm` | `/mipm` | был |
| Бизнес-партнёр стрима | `test_mipm_sa` | `/mipm` + `/departament/…` | был |
| Валидатор | `test_validator` | `/validator` | был |
| Руководитель валидации | `test_validator_lead` | `/validator`, `/validator/validator_lead` | был |
| Архитектор данных ML | `test_architect` | `/architect` | **создан** |
| Аналитик качества работы моделей ДАДМ | `test_sum_mntranlst` | `/mntranlst` | был |
| Аналитик качества модельных данных | `test_sum_da` | `/da` | был |
| Аналитик качества модельных данных стрима | `test_sum_da_stream` | `/da_stream` + департамент | был |
| Прикладной администратор | `test_sum_appadmin` | `/appadmin` | был |
| Аудитор ИБ | `test_sum_auditorib` | `/auditorib` | был |
| Аудитор | `test_auditor` | `/auditor` | **создан** |
| Руководитель программ ДАДМ | `test_sum_saprg` | `/saprg` | был |
| Конфигуратор Смарт-Анкеты | `test_sum_sacfg` | `/sacfg/dev_sum_sacfg` | был |
| Представитель стрима — не участника ЖЦМ | `test_sum_sarep` | `/sarep` | был |
| Бизнес-заказчик | `test_business_customer` | `/business_customer` | был |
| Сотрудник проектного офиса | `test_prjtoffice` | `/prjtoffice` | **создан** |

## Дополнительно (стримовые sarep)

| Логин | Группа |
|---|---|
| `test_sum_sarep_idsrc` | `/sarep/dev_sum_sarep_idsrc` |
| `test_sum_sarep_mdlctl` | `/sarep/dev_sum_sarep_mdlctl` |
| `test_sum_sarep_pirm` | `/sarep/dev_sum_sarep_pirm` |
| `test_sum_sarep_strdat` | `/sarep/dev_sum_sarep_strdat` |
| `test_sum_sarep_digagt` | `/sarep/dev_sum_sarep_digagt` |
| `test_sum_sarep_dadm` | `/sarep/dev_sum_sarep_dadm` |

## Заметки

- Создано только на **SUMD** (sumcore не трогали).
- Для ролей «нет доступа» (`business_customer`, `prjtoffice`) группы есть, `anketa_*` на них пустые — так и задумано.
- `test_sum_sacfg` сидит в дочерней `/sacfg/dev_sum_sacfg` (наследует роли `/sacfg`).
