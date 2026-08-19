import { Injectable } from "@nestjs/common";
import type { V2QuestionnaireExportLockDto } from "@smart-anketa/api-contract";

/**
 * Публикует occupancy выгрузки XLSX в тот же namespace, что и edit-lock.
 * Gateway подписывается в onModuleInit — без цикла DI на JobService.
 */
@Injectable()
export class V2QuestionnaireWsPublisher {
	private emitExport:
		| ((lock: V2QuestionnaireExportLockDto) => void)
		| null = null;
	private lastBusy: boolean | undefined;

	attachExportLock(
		emit: (lock: V2QuestionnaireExportLockDto) => void,
	): void {
		this.emitExport = emit;
	}

	publishExportLock(lock: V2QuestionnaireExportLockDto): void {
		if (this.lastBusy === lock.busy) return;
		this.lastBusy = lock.busy;
		this.emitExport?.(lock);
	}
}
