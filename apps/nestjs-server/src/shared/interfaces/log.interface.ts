/**
 * Структура записи лога, отправляемой в СС Журналирование.
 * Основано на Таблице 4.5.1.1 и 4.5.1.3.1 ТИС 1404.
 */
export interface ILogEntry {
    // Базовые атрибуты
    eventId: string;
    extEventId?: string;
    parentId?: string;
    appName: string;
    level: string;
    encProvider?: string;
    text: string;
    localTime: string;
    esIndexLevelSuffix?: string;
    tslgClientVersion: string;
    tslgServerVersion?: string;
    '@timestamp'?: number;
    namespace?: string;
    risCode?: string;
    projectCode: string;

    // Расширенные атрибуты
    appType: string;
    envType: string;
    agrType?: string;

    // Java-контекст
    stack?: string;
    levelInt?: number;
    loggerName?: string;
    threadName?: string;
    callerClass?: string;
    callerMethod?: string;
    callerLine?: number;
    mdc?: Record<string, unknown>;
    status?: number;
    remoteUser?: string;
    request?: string;
    requestTime?: number;
    bodyBytesSent?: number;
    sessionId?: string;
    initiatorHost?: string;
    linkPage?: string;
    processingTime?: number;

    // Агрегационный контекст (TRACING)
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;

    // Данные пользователя
    userId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    userRoles?: string[];
    userGroups?: string[];

    // Ошибки
    errorMessage?: string;
    errorType?: string;
    errorCode?: string;
    reason?: string;

    // K8s
    PID?: number;
    workerId?: number;
    podName?: string;
    podIp?: string;
    nodeName?: string;
    tec?: {
        nodeName?: string;
        podIp?: string;
    };

    // HTTP
    requestMethod?: string;
    requestURI?: string;
    requestBody?: string;
    requestHeaders?: Record<string, unknown>;
    responseStatus?: number;
    messageType?: string;

    // Прочее
    timestamp?: string;
    message?: string;
    event?: string;
    [key: string]: unknown;
}
