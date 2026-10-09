/**
 * Утилита маскирования чувствительных данных согласно правилам
 * ТИС 1404 (БЛ.01 «Маскирование чувствительных данных»):
 *
 *  ┌──────────────────┬──────────────────────────────────────────────┐
 *  │ Кол-во символов  │ Правило                                      │
 *  ├──────────────────┼──────────────────────────────────────────────┤
 *  │ 1                │ маскируем полностью                          │
 *  │ 2–4              │ маскируем всё, начиная со 2-го символа       │
 *  │ 5–9              │ маскируем 60% символов, начиная со 2-го      │
 *  │ 10–15            │ маскируем 60% символов, начиная с 3-го       │
 *  │ 16 и более       │ маскируем 60% символов, начиная с середины   │
 *  └──────────────────┴──────────────────────────────────────────────┘
 */

const MASK_CHAR = "*";

/**
 * Маскирует строку согласно правилам ТИС 1404.
 *
 * @param str       исходная строка
 * @param maskRatio доля маскируемых символов (по умолчанию 0.6 = 60%)
 */
export function maskString(str: string, maskRatio = 0.6): string {
    if (!str || typeof str !== "string") return str;
    const n = str.length;
    if (n === 0) return str;
    if (n === 1) return MASK_CHAR;

    let maskStart: number;
    let maskCount: number;

    if (n <= 4) {
        // 2–4: маскируем всё, начиная со 2-го
        maskStart = 1;
        maskCount = n - 1;
    } else if (n <= 9) {
        // 5–9: маскируем 60% от общей длины, начиная со 2-го
        maskStart = 1;
        maskCount = Math.ceil(n * maskRatio);
    } else if (n <= 15) {
        // 10–15: маскируем 60% от общей длины, начиная с 3-го
        maskStart = 2;
        maskCount = Math.ceil(n * maskRatio);
    } else {
        // 16+: маскируем 60% символов, начиная с середины строки.
        // Нечётная/чётная длина — маска центрируется,
        // при нечётной разнице левая часть меньше.
        maskCount = Math.ceil(n * maskRatio);
        const visible = n - maskCount;
        maskStart = Math.floor(visible / 2);
    }

    // Защита от выхода за границы
    if (maskStart < 0) maskStart = 0;
    if (maskStart >= n) maskStart = n - 1;
    if (maskStart + maskCount > n) maskCount = n - maskStart;
    if (maskCount < 0) maskCount = 0;

    return (
        str.substring(0, maskStart) +
        MASK_CHAR.repeat(maskCount) +
        str.substring(maskStart + maskCount)
    );
}

/**
 * Маскирует JWT-токен. Для длинных токенов (3 части через точку)
 * оставляем только префикс заголовка и короткий фрагмент сигнатуры —
 * этого достаточно для диагностики и безопасно.
 */
export function maskJwtToken(token: string): string {
    if (!token || typeof token !== "string") return token;
    if (token.length < 20) return MASK_CHAR.repeat(token.length);

    try {
        const parts = token.split(".");
        if (parts.length !== 3) return maskString(token);
        const header = parts[0] ?? "";
        const payload = parts[1] ?? "";
        const signature = parts[2] ?? "";
        return (
            `${header}.${payload.substring(0, 6)}...` +
            `[SANITIZED len=${token.length}]...` +
            `${signature.substring(0, 6)}`
        );
    } catch {
        return maskString(token);
    }
}