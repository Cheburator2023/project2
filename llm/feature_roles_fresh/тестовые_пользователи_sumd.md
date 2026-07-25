# Тестовые пользователи SUMD (copy-paste для QA)

Keycloak: `https://keycloak-sumd.sumd.dk1-sumd01.innodev.local/auth` · realm `cym`  
Пароль = логин. Stand-prefix AD: `test_`.

Модельные суффиксы → стрим / департамент:
- `kmbkcb` — Разработка моделей КМБ и КСБ · Управление моделирования КИБ и СМБ
- `ptitpc` — AI-модели партнерств · Управление моделирования партнерств и ИТ-процессов
- `rnd` — Моделирование RnD · Управление перспективных алгоритмов машинного обучения
- `rb` — Моделирование РБ · Управление моделирования РБ
- `finmdl` — Финансовое моделирование · Управление процессных и финансовых моделей

Sarep суффиксы → стрим:
- `idsrc` — Источники данных
- `mdlctl` — Контроль моделей
- `pirm` — Платформы и Решения для моделирования
- `strdat` — Потоковые данные
- `digagt` — Цифровые агенты
- `dadm` — ДАДМ

Стрим-логины = AD-лист: `test_sum_de_kmbkcb`, `test_sum_ds_rb`, `test_sum_mo_finmdl`, …

SUMD leads: top-level `/ds_lead`, `/de_lead`, `/modelops_lead`, `/validator_lead`  
(не `/ds/ds_lead` — это seed-shape; sync заливает роли в оба).

---

```
test_ds  # DS (все модельные стримы)
/ds
```

```
test_ds_lead  # Руководитель DS
/ds
/ds_lead
```

```
test_sum_ds_kmbkcb  # DS · КМБ и КСБ / КИБ и СМБ
/ds/test_sum_ds_kmbkcb
```

```
test_sum_ds_ptitpc  # DS · AI-модели партнерств
/ds/test_sum_ds_ptitpc
```

```
test_sum_ds_rnd  # DS · Моделирование RnD
/ds/test_sum_ds_rnd
```

```
test_sum_ds_rb  # DS · Моделирование РБ
/ds/test_sum_ds_rb
```

```
test_sum_ds_finmdl  # DS · Финансовое моделирование
/ds/test_sum_ds_finmdl
```

```
test_de  # DE (все модельные департаменты)
/de
```

```
test_de_lead  # Руководитель DE
/de
/de_lead
```

```
test_sum_de_kmbkcb  # DE · Управление моделирования КИБ и СМБ
/de/test_sum_de_kmbkcb
```

```
test_sum_de_ptitpc  # DE · Управление моделирования партнерств и ИТ-процессов
/de/test_sum_de_ptitpc
```

```
test_sum_de_rnd  # DE · Управление перспективных алгоритмов машинного обучения
/de/test_sum_de_rnd
```

```
test_sum_de_rb  # DE · Управление моделирования РБ
/de/test_sum_de_rb
```

```
test_sum_de_finmdl  # DE · Управление процессных и финансовых моделей
/de/test_sum_de_finmdl
```

```
test_modelops  # ModelOps (все модельные стримы)
/modelops
```

```
test_modelops_lead  # Руководитель ModelOps
/modelops
/modelops_lead
```

```
test_sum_mo_kmbkcb  # ModelOps · КМБ и КСБ / КИБ и СМБ
/modelops/test_sum_mo_kmbkcb
```

```
test_sum_mo_ptitpc  # ModelOps · AI-модели партнерств
/modelops/test_sum_mo_ptitpc
```

```
test_sum_mo_rnd  # ModelOps · Моделирование RnD
/modelops/test_sum_mo_rnd
```

```
test_sum_mo_rb  # ModelOps · Моделирование РБ
/modelops/test_sum_mo_rb
```

```
test_sum_mo_finmdl  # ModelOps · Финансовое моделирование
/modelops/test_sum_mo_finmdl
```

```
test_mipm  # Бизнес-партнёр
/mipm/test_sum_mipm
```

```
test_mipm_sa  # Бизнес-партнёр стрима · КМБ и КСБ
/mipm_stream/test_sum_mipm_kmbkcb
```

```
test_sum_mipm_kmbkcb  # Бизнес-партнёр стрима · КМБ и КСБ
/mipm_stream/test_sum_mipm_kmbkcb
```

```
test_sum_mipm_ptitpc  # Бизнес-партнёр стрима · AI-модели партнерств
/mipm_stream/test_sum_mipm_ptitpc
```

```
test_sum_mipm_rnd  # Бизнес-партнёр стрима · Моделирование RnD
/mipm_stream/test_sum_mipm_rnd
```

```
test_sum_mipm_rb  # Бизнес-партнёр стрима · Моделирование РБ
/mipm_stream/test_sum_mipm_rb
```

```
test_sum_mipm_finmdl  # Бизнес-партнёр стрима · Финансовое моделирование
/mipm_stream/test_sum_mipm_finmdl
```

```
test_validator  # Валидатор
/validator
```

```
test_validator_lead  # Руководитель валидации
/validator
/validator_lead
```

```
test_architect  # Архитектор данных ML (все стримы)
/architect/test_sum_arch_kmbkcb
/architect/test_sum_arch_ptitpc
/architect/test_sum_arch_rnd
/architect/test_sum_arch_rb
/architect/test_sum_arch_finmdl
```

```
test_sum_arch_kmbkcb  # Архитектор · КМБ и КСБ
/architect/test_sum_arch_kmbkcb
```

```
test_sum_mntranlst  # Аналитик качества работы моделей ДАДМ
/mntranlst/test_sum_mntranlst
```

```
test_sum_da  # Аналитик качества модельных данных
/da/test_sum_da
```

```
test_sum_da_kmbkcb  # Аналитик качества модельных данных стрима · КИБ и СМБ
/da_stream/test_sum_da_kmbkcb
```

```
test_sum_appadmin  # Прикладной администратор (только view+audit)
/admin_it/test_sum_appadmin
```

```
test_sum_auditorib  # Аудитор ИБ
/auditor/test_sum_auditorib
```

```
test_auditor  # Аудитор
/controller/test_sum_auditor
```

```
test_sum_saprg  # Руководитель программ ДАДМ
/saprg/test_sum_saprg
```

```
test_sum_sacfg  # Конфигуратор Смарт-Анкеты
/sacfg/test_sum_sacfg
```

```
test_sum_sarep  # Представитель стрима — не участника ЖЦМ (umbrella)
/sarep
```

```
test_business_customer  # Бизнес-заказчик
/business_customer
```

```
test_prjtoffice  # Сотрудник проектного офиса
/project_office/test_sum_prjtoffice
```

```
test_sum_sarep_idsrc  # Представитель стрима · Источники данных
/sarep/test_sum_sarep_idsrc
```

```
test_sum_sarep_mdlctl  # Представитель стрима · Контроль моделей
/sarep/test_sum_sarep_mdlctl
```

```
test_sum_sarep_pirm  # Представитель стрима · ПиРМ
/sarep/test_sum_sarep_pirm
```

```
test_sum_sarep_strdat  # Представитель стрима · Потоковые данные
/sarep/test_sum_sarep_strdat
```

```
test_sum_sarep_digagt  # Представитель стрима · Цифровые агенты
/sarep/test_sum_sarep_digagt
```

```
test_sum_sarep_dadm  # Представитель стрима · ДАДМ
/sarep/test_sum_sarep_dadm
```
