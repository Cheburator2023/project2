import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
	TrackerPushPublicKeyDto,
	TrackerPushSubscriptionDto,
	UpsertTrackerPushSubscriptionRequestDto,
} from "@smart-anketa/api-contract";
import {
	generateVapidKeys,
	sendPushNotification,
	WebPushError,
	type VapidConfig,
} from "@smart-anketa/web-push";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { In, Repository } from "typeorm";
import { ulid } from "ulid";
import { KanbanBoardPushSubscriptionEntity } from "../entities/kanban-board-push-subscription.entity";

export type TrackerPushPayload = {
	title: string;
	body: string;
	url?: string;
	tag?: string;
};

type StoredVapidKeys = {
	publicKey: string;
	privateKey: string;
};

/** Local DEV fallback when TRACKER_VAPID_* is unset — survives nest restarts. */
const DEV_VAPID_FILE = join(process.cwd(), ".tracker-vapid.json");

function readStoredVapidKeys(path: string): StoredVapidKeys | null {
	try {
		if (!existsSync(path)) return null;
		const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<StoredVapidKeys>;
		const publicKey = parsed.publicKey?.trim() ?? "";
		const privateKey = parsed.privateKey?.trim() ?? "";
		if (!publicKey || !privateKey) return null;
		return { publicKey, privateKey };
	} catch {
		return null;
	}
}

function writeStoredVapidKeys(path: string, keys: StoredVapidKeys): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(keys, null, 2)}\n`, "utf8");
}

@Injectable()
export class KanbanBoardPushService implements OnModuleInit {
	private readonly logger = new Logger(KanbanBoardPushService.name);
	private vapid: VapidConfig | null = null;
	private vapidReady = false;

	constructor(
		@InjectRepository(KanbanBoardPushSubscriptionEntity)
		private readonly subscriptionRepository: Repository<KanbanBoardPushSubscriptionEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		const subject =
			process.env.TRACKER_VAPID_SUBJECT?.trim() || "mailto:dev@localhost";
		const envPublic = process.env.TRACKER_VAPID_PUBLIC_KEY?.trim() ?? "";
		const envPrivate = process.env.TRACKER_VAPID_PRIVATE_KEY?.trim() ?? "";

		if (envPublic && envPrivate) {
			this.vapid = { publicKey: envPublic, privateKey: envPrivate, subject };
			this.vapidReady = true;
			return;
		}

		const stored = readStoredVapidKeys(DEV_VAPID_FILE);
		const keys = stored ?? (await generateVapidKeys());
		if (!stored) {
			writeStoredVapidKeys(DEV_VAPID_FILE, keys);
			this.logger.warn(
				`TRACKER_VAPID_* env missing — generated DEV keys at ${DEV_VAPID_FILE}`,
			);
		} else {
			this.logger.log(
				`TRACKER_VAPID_* env missing — reusing DEV keys from ${DEV_VAPID_FILE}`,
			);
		}
		this.vapid = {
			publicKey: keys.publicKey,
			privateKey: keys.privateKey,
			subject,
		};
		this.vapidReady = true;
	}

	getVapidPublicKey(): TrackerPushPublicKeyDto {
		return { publicKey: this.vapid?.publicKey ?? "" };
	}

	async upsertSubscription(
		dto: UpsertTrackerPushSubscriptionRequestDto,
		userAgent?: string | null,
	): Promise<TrackerPushSubscriptionDto> {
		const endpoint = dto.endpoint.trim();
		const p256dh = dto.p256dh.trim();
		const auth = dto.auth.trim();
		const assigneeName = dto.assigneeName.trim();
		if (!endpoint || !p256dh || !auth || !assigneeName) {
			throw new BadRequestException("Неполные данные push-подписки");
		}

		let row = await this.subscriptionRepository.findOne({
			where: { endpoint },
		});
		if (!row) {
			row = this.subscriptionRepository.create({
				id: ulid(),
				endpoint,
				p256dh,
				auth,
				assigneeName,
				userAgent: userAgent?.trim() || null,
			});
		} else {
			row.p256dh = p256dh;
			row.auth = auth;
			row.assigneeName = assigneeName;
			row.userAgent = userAgent?.trim() || row.userAgent;
		}
		await this.subscriptionRepository.save(row);
		return {
			endpoint: row.endpoint,
			p256dh: row.p256dh,
			auth: row.auth,
			assigneeName: row.assigneeName,
		};
	}

	async deleteByEndpoint(endpoint: string): Promise<void> {
		const trimmed = endpoint.trim();
		if (!trimmed) return;
		await this.subscriptionRepository.delete({ endpoint: trimmed });
	}

	/** Fire-and-forget: does not throw to callers. */
	notifyAssignees(names: string[], payload: TrackerPushPayload): void {
		void this.sendToAssignees(names, payload).catch((error) => {
			this.logger.warn(
				`Tracker push notify failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		});
	}

	private async sendToAssignees(
		names: string[],
		payload: TrackerPushPayload,
	): Promise<void> {
		if (!this.vapidReady || !this.vapid) return;
		const uniqueNames = [
			...new Set(names.map((name) => name.trim()).filter(Boolean)),
		];
		if (!uniqueNames.length) return;

		const rows = await this.subscriptionRepository.find({
			where: { assigneeName: In(uniqueNames) },
		});
		if (!rows.length) {
			this.logger.debug(
				`No push subscriptions for [${uniqueNames.join(", ")}] (${payload.title})`,
			);
			return;
		}

		const vapid = this.vapid;
		await Promise.all(
			rows.map(async (row) => {
				try {
					const delivered = await sendPushNotification(
						{
							endpoint: row.endpoint,
							keys: { p256dh: row.p256dh, auth: row.auth },
						},
						{
							title: payload.title,
							body: payload.body,
							url: payload.url,
							tag: payload.tag,
						},
						vapid,
					);
					if (!delivered) {
						await this.subscriptionRepository.delete({ id: row.id });
						this.logger.warn(
							`Push subscription expired for ${row.assigneeName}, removed`,
						);
						return;
					}
					this.logger.log(
						`Push sent to ${row.assigneeName}: ${payload.title}`,
					);
				} catch (error) {
					const statusCode =
						error instanceof WebPushError
							? error.statusCode
							: error &&
								  typeof error === "object" &&
								  "statusCode" in error &&
								  typeof (error as { statusCode?: unknown }).statusCode ===
										"number"
								? (error as { statusCode: number }).statusCode
								: undefined;
					this.logger.warn(
						`Push to ${row.assigneeName} failed (${statusCode ?? "?"}): ${
							error instanceof Error ? error.message : String(error)
						}. Re-enable «Уведомления» if VAPID keys changed.`,
					);
				}
			}),
		);
	}
}
