import { SetMetadata } from "@nestjs/common";

// Ключ для хранения метаданных о необходимости фильтрации по стримам
export const STREAM_FILTER_KEY = "stream_filter";

/**
 * Декоратор для автоматического применения фильтрации по стримам
 *
 * @description
 * Помечает методы контроллера для автоматической фильтрации результатов
 * на основе ролей пользователя (DS, DE, ModelOps) и их доступных стримов.
 *
 * @usage
 * ```typescript
 * @Get('calculations')
 * @StreamFilter()
 * async getCalculations() {
 *   // Результат будет автоматически отфильтрован
 *   return this.service.findAll();
 * }
 * ```
 *
 * @how_it_works
 * 1. Декоратор добавляет метаданные к методу
 * 2. StreamFilterInterceptor видит эти метаданные
 * 3. Интерцептор применяет фильтрацию к ответу
 *
 * @filtering_logic
 * - DS/DE/ModelOps роли: показываются только анкеты с разрешенными стримами
 * - Остальные роли: показываются все анкеты без фильтрации
 * - Если у пользователя нет доступных стримов: возвращается пустой результат
 */
export const StreamFilter = () => SetMetadata(STREAM_FILTER_KEY, true);
