@startuml SmartAnketa_Metamodel


skinparam backgroundColor transparent
skinparam defaultFontName Arial
skinparam defaultFontSize 13


skinparam class {
BackgroundColor #FFF9C4
BorderColor #2E5496
FontColor #1F3864
HeaderBackgroundColor #FFF9C4
HeaderFontColor #1F3864
ArrowColor #2E5496
}


skinparam note {
BackgroundColor #EEF2F8
BorderColor #2E5496
FontColor #595959
}


package "Анкета" <<Frame>> {




package "Разделы" <<Frame>> {
class Раздел1_Общие_Сведения
class Раздел2_Модельный_Стрим
class Раздел3_платформенный_Стрим
}


package "Компоненты и параметры" <<Frame>> {
class АрхитектурныйКомпонент


note right of АрхитектурныйКомпонент
Допускается несколько
экземпляров одного типа.
Каждый независим.
end note


class ЗначениеПараметраКомпонента


note right of ЗначениеПараметраКомпонента
Изменение значения → поиск
в СправочникеТиповыхЗадач
по ключу: тип + параметр
+ значение → создать / удалить
ТиповуюЗадачу реактивно
end note


АрхитектурныйКомпонент "1" *-- "N" ЗначениеПараметраКомпонента
}


package "Задачи" <<Frame>> {
class СправочникТиповыхЗадач
class ТиповаяЗадача


note bottom of ТиповаяЗадача
Формируется автоматически.
Пользователь не редактирует.
Нормативная оценка — из справочника.
end note


class НетиповаяЗадача


note bottom of НетиповаяЗадача
Добавляется пользователем вручную.
end note


ЗначениеПараметраКомпонента ..> СправочникТиповыхЗадач : триггер
СправочникТиповыхЗадач "1" --> "N" ТиповаяЗадача : создаёт
}
}


' Связи компонентов с разделами
Раздел2_Модельный_Стрим "1" *-- "N" АрхитектурныйКомпонент : содержит


@enduml
