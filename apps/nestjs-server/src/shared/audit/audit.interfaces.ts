export interface SidecarAuditRequest {
    eventCode: string;
    eventClass: 'START' | 'SUCCESS' | 'FAILURE';
    correlationId?: string;
    timestamp?: string;
    initiator?: {
        sub?: string;
        channel?: string;
        realm?: string;
        sourceIp?: string;
    };
    additionalFields?: Record<string, unknown>;
}

export interface PendingAuditEvent {
    id: string;
    request: SidecarAuditRequest;
}