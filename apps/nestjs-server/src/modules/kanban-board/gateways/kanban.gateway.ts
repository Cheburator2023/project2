import {
	ConflictException,
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
	KANBAN_WS_EVENTS,
	KANBAN_WS_NAMESPACE,
	type KanbanLockChangedPayload,
	type KanbanLockJoinAck,
	type KanbanLockJoinPayload,
	type KanbanLockLeavePayload,
	type KanbanLockSnapshotPayload,
	type KanbanBoardTaskLockDto,
} from "@smart-anketa/api-contract";
import type { Server, Socket } from "socket.io";
import { Public } from "../../../shared/decorators/public.decorator";
import {
	holderFromSocket,
	requireHandshakeToken,
} from "../../../shared/websocket/ws-handshake";
import { KanbanBoardTaskLockService } from "../services/kanban-board-task-lock.service";
import { KanbanWsPublisher } from "../services/kanban-ws-publisher.service";

const TASK_ID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const BUMP_EXPIRY_MS = 30_000;

function conflictLockPayload(error: unknown): {
	message: string;
	lock?: KanbanBoardTaskLockDto;
} {
	if (error instanceof ConflictException) {
		const raw = error.getResponse();
		if (typeof raw === "string") return { message: raw };
		if (raw && typeof raw === "object") {
			const body = raw as {
				message?: string | { message?: string; lock?: KanbanBoardTaskLockDto };
				lock?: KanbanBoardTaskLockDto;
			};
			if (typeof body.message === "string") {
				return { message: body.message, lock: body.lock };
			}
			if (body.message && typeof body.message === "object") {
				return {
					message:
						body.message.message ?? "Задача сейчас редактируется",
					lock: body.message.lock ?? body.lock,
				};
			}
			return {
				message: "Задача сейчас редактируется",
				lock: body.lock,
			};
		}
	}
	return {
		message:
			error instanceof Error ? error.message : "Не удалось захватить блокировку",
	};
}

@Public()
@WebSocketGateway({
	namespace: KANBAN_WS_NAMESPACE,
	cors: { origin: "*" },
})
export class KanbanGateway
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
		private readonly lockService: KanbanBoardTaskLockService,
		private readonly wsPublisher: KanbanWsPublisher,
	) {}

	onModuleInit(): void {
		this.wsPublisher.attachSync((payload) => {
			this.server?.emit(KANBAN_WS_EVENTS.sync, payload);
		});
		this.bumpTimer = setInterval(() => {
			void this.lockService.bumpExpiryForTracked();
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
		const locks = await this.lockService.listActive();
		const snapshot: KanbanLockSnapshotPayload = { locks };
		client.emit(KANBAN_WS_EVENTS.snapshot, snapshot);
	}

	async handleDisconnect(client: Socket): Promise<void> {
		const released = await this.lockService.releaseAllForSocket(client.id);
		for (const taskId of released) {
			this.emitChanged({ type: "released", taskId });
		}
	}

	@SubscribeMessage(KANBAN_WS_EVENTS.join)
	async join(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: KanbanLockJoinPayload,
	): Promise<KanbanLockJoinAck> {
		const taskId = body?.taskId?.trim() ?? "";
		if (!TASK_ID_RE.test(taskId)) {
			return { ok: false, message: "Некорректный идентификатор задачи" };
		}
		try {
			const lock = await this.lockService.acquire(
				taskId,
				holderFromSocket(client, body?.lockedByLabel),
				client.id,
			);
			this.emitChanged({ type: "acquired", lock });
			return { ok: true, lock };
		} catch (error) {
			const denied = conflictLockPayload(error);
			return {
				ok: false,
				message: denied.message,
				lock: denied.lock,
			};
		}
	}

	@SubscribeMessage(KANBAN_WS_EVENTS.leave)
	async leave(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: KanbanLockLeavePayload,
	): Promise<{ ok: true }> {
		const taskId = body?.taskId?.trim() ?? "";
		if (!TASK_ID_RE.test(taskId)) return { ok: true };
		const didRelease = await this.lockService.release(
			taskId,
			holderFromSocket(client),
			client.id,
		);
		if (didRelease) {
			this.emitChanged({ type: "released", taskId });
		}
		return { ok: true };
	}

	private emitChanged(payload: KanbanLockChangedPayload): void {
		this.server?.emit(KANBAN_WS_EVENTS.changed, payload);
	}
}
