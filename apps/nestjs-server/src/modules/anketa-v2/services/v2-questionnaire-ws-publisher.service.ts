import { Injectable } from "@nestjs/common";
import type {
	V2QuestionnaireExportJobStatusDto,
	V2QuestionnaireExportLockDto,
	V2QuestionnaireRegistrySyncPayload,
	V2TemplateReadyPayload,
} from "@smart-anketa/api-contract";

/**
 * Публикует occupancy выгрузки и служебные события v2 в namespace edit-lock.
 * Gateway подписывается в onModuleInit — без цикла DI.
 */
@Injectable()
export class V2QuestionnaireWsPublisher {
	private emitExport:
		| ((lock: V2QuestionnaireExportLockDto) => void)
		| null = null;
	private emitExportJob:
		| ((job: V2QuestionnaireExportJobStatusDto) => void)
		| null = null;
	private emitTemplateReady:
		| ((payload: V2TemplateReadyPayload) => void)
		| null = null;
	private emitRegistrySync:
		| ((payload: V2QuestionnaireRegistrySyncPayload) => void)
		| null = null;
	private registryTimer: ReturnType<typeof setTimeout> | null = null;
	private lastBusy: boolean | undefined;

	attachExportLock(
		emit: (lock: V2QuestionnaireExportLockDto) => void,
	): void {
		this.emitExport = emit;
	}

	attachExportJob(
		emit: (job: V2QuestionnaireExportJobStatusDto) => void,
	): void {
		this.emitExportJob = emit;
	}

	attachTemplateReady(
		emit: (payload: V2TemplateReadyPayload) => void,
	): void {
		this.emitTemplateReady = emit;
	}

	attachRegistrySync(
		emit: (payload: V2QuestionnaireRegistrySyncPayload) => void,
	): void {
		this.emitRegistrySync = emit;
	}

	publishExportLock(lock: V2QuestionnaireExportLockDto): void {
		if (this.lastBusy === lock.busy) return;
		this.lastBusy = lock.busy;
		this.emitExport?.(lock);
	}

	publishExportJob(job: V2QuestionnaireExportJobStatusDto): void {
		this.emitExportJob?.(job);
	}

	publishTemplateReady(payload: V2TemplateReadyPayload): void {
		this.emitTemplateReady?.(payload);
	}

	/** Состав реестра (create/copy/delete/import): один emit на пачку, не N. */
	publishRegistrySync(): void {
		if (this.registryTimer) clearTimeout(this.registryTimer);
		this.registryTimer = setTimeout(() => {
			this.registryTimer = null;
			this.emitRegistrySync?.({ at: Date.now() });
		}, 50);
	}
}
