import type { Socket } from "socket.io";

export type WsOccupancyHolder = {
	label: string;
	userId: string | null;
};

export function readHandshakeAuth(client: Socket): Record<string, unknown> {
	const auth = client.handshake?.auth;
	return auth && typeof auth === "object" && !Array.isArray(auth)
		? (auth as Record<string, unknown>)
		: {};
}

export function handshakeToken(client: Socket): string {
	const auth = readHandshakeAuth(client);
	if (typeof auth.token === "string") return auth.token;
	const header = client.handshake?.headers?.authorization;
	if (typeof header === "string" && header.startsWith("Bearer ")) {
		return header.slice(7);
	}
	return "";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length < 2) return null;
	try {
		const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
		const payload = JSON.parse(json) as unknown;
		if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
			return null;
		}
		return payload as Record<string, unknown>;
	} catch {
		return null;
	}
}

export function holderFromSocket(
	client: Socket,
	lockedByLabel?: string,
): WsOccupancyHolder {
	const auth = readHandshakeAuth(client);
	const token = handshakeToken(client);
	const payload = token ? decodeJwtPayload(token) : null;
	const fromBody = lockedByLabel?.trim() ?? "";
	const fromAuth =
		typeof auth.lockedByLabel === "string" ? auth.lockedByLabel.trim() : "";
	const fromJwt =
		typeof payload?.preferred_username === "string"
			? payload.preferred_username.trim()
			: typeof payload?.username === "string"
				? payload.username.trim()
				: "";
	const userIdRaw = payload?.sub ?? payload?.id ?? payload?.preferred_username;
	const userId =
		typeof userIdRaw === "string" && userIdRaw.trim() ? userIdRaw.trim() : null;
	return {
		label: fromBody || fromAuth || fromJwt || "Пользователь",
		userId,
	};
}

export function requireHandshakeToken(client: Socket): boolean {
	if (process.env.NO_ROLES === "true") return true;
	return Boolean(handshakeToken(client));
}
