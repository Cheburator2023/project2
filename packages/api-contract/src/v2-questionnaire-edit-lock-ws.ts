import type {
	V2QuestionnaireEditLockDto,
	V2QuestionnaireExportJobStatusDto,
	V2QuestionnaireExportLockDto,
} from "./v2-questionnaire.types";

/** Namespace Socket.IO для occupancy / edit-lock анкет v2. */
export const V2_EDIT_LOCK_WS_NAMESPACE = "/v2-edit-locks";

export const V2_EDIT_LOCK_WS_EVENTS = {
	join: "lock:join",
	leave: "lock:leave",
	snapshot: "lock:snapshot",
	changed: "lock:changed",
	exportJob: "export:job",
	templateReady: "template:ready",
} as const;

export type V2EditLockJoinPayload = {
	questionnaireId: string;
	/** Подпись в реестре; сервер берёт её из join, а не только из handshake. */
	lockedByLabel?: string;
};

export type V2EditLockLeavePayload = {
	questionnaireId: string;
};

export type V2EditLockSnapshotPayload = {
	locks: V2QuestionnaireEditLockDto[];
	/** Глобальная выгрузка XLSX (бывший GET .../export/xlsx/lock). */
	exportLock?: V2QuestionnaireExportLockDto;
	/** Джобы выгрузки в полёте — чтобы не поллить status после reconnect. */
	exportJobs?: V2QuestionnaireExportJobStatusDto[];
};

export type V2TemplateReadyPayload = {
	templateId: string;
	typicalWorksReady: boolean;
	error?: string;
};

export type V2EditLockChangedPayload =
	| { type: "acquired"; lock: V2QuestionnaireEditLockDto }
	| { type: "released"; questionnaireId: string }
	| { type: "export"; lock: V2QuestionnaireExportLockDto };

export type V2EditLockJoinAck =
	| { ok: true; lock: V2QuestionnaireEditLockDto }
	| {
			ok: false;
			message: string;
			lock?: V2QuestionnaireEditLockDto;
	  };
