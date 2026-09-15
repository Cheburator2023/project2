import {
	ConflictException,
	NotFoundException,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import {
	V2_EDIT_LOCK_WS_EVENTS,
	V2_EDIT_LOCK_WS_NAMESPACE,
	type V2EditLockChangedPayload,
	type V2EditLockJoinAck,
	type V2EditLockJoinPayload,
	type V2EditLockLeavePayload,
	type V2EditLockSnapshotPayload,
	type V2QuestionnaireEditLockDto,
} from "@smart-anketa/api-contract";
import type { Server, Socket } from "socket.io";
import { Public } from "../../../shared/decorators/public.decorator";
import {
	holderFromSocket,
	requireHandshakeToken,
} from "../../../shared/websocket/ws-handshake";
import {
	V2QuestionnaireEditLockService,
	type V2QuestionnaireEditLockHolder,
} from "../services/v2-questionnaire-edit-lock.service";
import { V2QuestionnaireExportJobService } from "../services/v2-questionnaire-export-job.service";
import { V2QuestionnaireWsPublisher } from "../services/v2-questionnaire-ws-publisher.service";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUMP_EXPIRY_MS = 30_000;

function holderFromJoin(
	client: Socket,
	body: V2EditLockJoinPayload,
): V2QuestionnaireEditLockHolder {
	return holderFromSocket(client, body?.lockedByLabel);
}

function conflictLockPayload(error: unknown): {
	message: string;
	lock?: V2QuestionnaireEditLockDto;
} {
	if (error instanceof ConflictException) {
		const raw = error.getResponse();
		if (typeof raw === "string") return { message: raw };
		if (raw && typeof raw === "object") {
			const body = raw as {
				message?: string | { message?: string; lock?: V2QuestionnaireEditLockDto };
				lock?: V2QuestionnaireEditLockDto;
			};
			if (typeof body.message === "string") {
				return { message: body.message, lock: body.lock };
			}
			if (body.message && typeof body.message === "object") {
				return {
					message:
						body.message.message ??
						"Анкета сейчас редактируется другим пользователем",
					lock: body.message.lock ?? body.lock,
				};
			}
			return {
				message: "Анкета сейчас редактируется другим пользователем",
				lock: body.lock,
			};
		}
	}
	return {
		message:
			error instanceof Error
				? error.message
				: "Не удалось захватить блокировку",
	};
}

@Public()
@WebSocketGateway({
	namespace: V2_EDIT_LOCK_WS_NAMESPACE,
	cors: { origin: "*" },
})
export class V2QuestionnaireEditLockGateway
	implements
		OnGatewayConnection,
		OnGatewayDisconnect,
		OnModuleInit,
		OnModuleDestroy
{
	@WebSocketServer()
	server!: Server;

	private bumpTimer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private readonly editLockService: V2QuestionnaireEditLockService,
		private readonly exportJobService: V2QuestionnaireExportJobService,
		private readonly wsPublisher: V2QuestionnaireWsPublisher,
	) {}

	onModuleInit(): void {
		this.wsPublisher.attachExportLock((lock) => {
			this.emitChanged({ type: "export", lock });
		});
		this.wsPublisher.attachExportJob((job) => {
			this.server?.emit(V2_EDIT_LOCK_WS_EVENTS.exportJob, job);
		});
		this.wsPublisher.attachTemplateReady((payload) => {
			this.server?.emit(V2_EDIT_LOCK_WS_EVENTS.templateReady, payload);
		});
		this.wsPublisher.attachRegistrySync((payload) => {
			this.server?.emit(V2_EDIT_LOCK_WS_EVENTS.registrySync, payload);
		});
		this.bumpTimer = setInterval(() => {
			void this.editLockService.bumpExpiryForTracked();
		}, BUMP_EXPIRY_MS);
	}

	onModuleDestroy(): void {
		if (this.bumpTimer) clearInterval(this.bumpTimer);
		this.bumpTimer = null;
	}

	async handleConnection(client: Socket): Promise<void> {
		if (!requireHandshakeToken(client)) {
			client.disconnect(true);
			return;
		}
		const [locks, exportLock, exportJobs] = await Promise.all([
			this.editLockService.listActive(),
			this.exportJobService.getLock(),
			this.exportJobService.listInFlightStatuses(),
		]);
		const snapshot: V2EditLockSnapshotPayload = {
			locks,
			exportLock,
			exportJobs,
		};
		client.emit(V2_EDIT_LOCK_WS_EVENTS.snapshot, snapshot);
	}

	async handleDisconnect(client: Socket): Promise<void> {
		const released = await this.editLockService.releaseAllForSocket(client.id);
		for (const questionnaireId of released) {
			this.emitChanged({ type: "released", questionnaireId });
		}
	}

	@SubscribeMessage(V2_EDIT_LOCK_WS_EVENTS.join)
	async join(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: V2EditLockJoinPayload,
	): Promise<V2EditLockJoinAck> {
		const questionnaireId = body?.questionnaireId?.trim() ?? "";
		if (!UUID_RE.test(questionnaireId)) {
			return { ok: false, message: "Некорректный идентификатор анкеты" };
		}
		try {
			const lock = await this.editLockService.acquire(
				questionnaireId,
				holderFromJoin(client, body),
				client.id,
			);
			this.emitChanged({ type: "acquired", lock });
			return { ok: true, lock };
		} catch (error) {
			if (error instanceof NotFoundException) {
				return {
					ok: false,
					message:
						typeof error.message === "string"
							? error.message
							: "Анкета не найдена",
					reason: "not_found",
				};
			}
			const denied = conflictLockPayload(error);
			return {
				ok: false,
				message: denied.message,
				lock: denied.lock,
				reason: error instanceof ConflictException ? "lock" : undefined,
			};
		}
	}

	@SubscribeMessage(V2_EDIT_LOCK_WS_EVENTS.leave)
	async leave(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: V2EditLockLeavePayload,
	): Promise<{ ok: true }> {
		const questionnaireId = body?.questionnaireId?.trim() ?? "";
		if (!UUID_RE.test(questionnaireId)) return { ok: true };
		const didRelease = await this.editLockService.release(
			questionnaireId,
			holderFromSocket(client),
			client.id,
		);
		if (didRelease) {
			this.emitChanged({ type: "released", questionnaireId });
		}
		return { ok: true };
	}

	private emitChanged(payload: V2EditLockChangedPayload): void {
		this.server?.emit(V2_EDIT_LOCK_WS_EVENTS.changed, payload);
	}
}
