import { extractKanbanCommentMentionNames } from "@smart-anketa/api-contract";

/**
 * Клиентские хелперы для @-упоминаний в комментариях.
 * Извлечение имён — из api-contract (тот же алгоритм, что на бэке для пушей).
 */
export { extractKanbanCommentMentionNames };

/** Вставить `@Имя` в позицию курсора (или в конец). */
export function insertKanbanCommentMention(
	body: string,
	name: string,
	cursor = body.length,
): { body: string; cursor: number } {
	const mention = name.includes(" ") ? `@"${name}"` : `@${name}`;
	const before = body.slice(0, cursor);
	const after = body.slice(cursor);
	const needsSpaceBefore =
		before.length > 0 && !/\s$/.test(before) && !before.endsWith("@");
	const prefix = needsSpaceBefore ? ` ${mention}` : mention;
	const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
	const inserted = needsSpaceAfter ? `${prefix} ` : prefix;
	const nextBody = `${before}${inserted}${after}`;
	return { body: nextBody, cursor: before.length + inserted.length };
}

/**
 * Если курсор сразу после незакрытого `@query`, вернуть query и диапазон замены.
 */
export function getKanbanCommentMentionQueryAtCursor(
	body: string,
	cursor: number,
): { query: string; start: number; end: number } | null {
	const before = body.slice(0, cursor);
	const match = before.match(/(^|[\s([{])@([^\s@]*)$/);
	if (!match) return null;
	const query = match[2] ?? "";
	const start = before.length - query.length - 1;
	return { query, start, end: cursor };
}

export function replaceKanbanCommentMentionQuery(
	body: string,
	range: { start: number; end: number },
	name: string,
): { body: string; cursor: number } {
	const mention = name.includes(" ") ? `@"${name}" ` : `@${name} `;
	const next = `${body.slice(0, range.start)}${mention}${body.slice(range.end)}`;
	return { body: next, cursor: range.start + mention.length };
}

/** Разбивка текста комментария для подсветки упоминаний. */
export function splitKanbanCommentBodyWithMentions(
	body: string,
	assigneeNames: readonly string[],
): Array<{ text: string; mention?: boolean }> {
	const mentions = extractKanbanCommentMentionNames(body, assigneeNames);
	if (!mentions.length) return [{ text: body }];

	const patterns = mentions
		.map((name) =>
			name.includes(" ")
				? `@"${escapeRegExp(name)}"`
				: `@${escapeRegExp(name)}(?=$|[\\s,.!?;:)\\]])`,
		)
		.sort((a, b) => b.length - a.length);
	const regex = new RegExp(`(${patterns.join("|")})`, "gi");
	const parts: Array<{ text: string; mention?: boolean }> = [];
	let last = 0;
	for (const match of body.matchAll(regex)) {
		const index = match.index ?? 0;
		if (index > last) parts.push({ text: body.slice(last, index) });
		parts.push({ text: match[0] ?? "", mention: true });
		last = index + (match[0]?.length ?? 0);
	}
	if (last < body.length) parts.push({ text: body.slice(last) });
	return parts.length ? parts : [{ text: body }];
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
