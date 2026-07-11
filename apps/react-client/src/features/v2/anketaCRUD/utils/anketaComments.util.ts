import type { V2QuestionnaireCommentDto } from "@smart-anketa/api-contract";

export type CommentSort = "recent" | "oldest";

export const COMMENT_SORT_LABELS: Record<CommentSort, string> = {
	recent: "Сначала новые",
	oldest: "Сначала старые",
};

export type CommentNode = V2QuestionnaireCommentDto & { replies: CommentNode[] };

export function buildCommentTree(comments: V2QuestionnaireCommentDto[]): CommentNode[] {
	const nodes = new Map(
		comments.map((comment) => [comment.id, { ...comment, replies: [] as CommentNode[] }]),
	);
	const roots: CommentNode[] = [];
	for (const comment of comments) {
		const node = nodes.get(comment.id);
		if (!node) continue;
		if (comment.parentCommentId && nodes.has(comment.parentCommentId)) {
			nodes.get(comment.parentCommentId)?.replies.push(node);
			continue;
		}
		roots.push(node);
	}
	return roots;
}

export function sortCommentRoots(roots: CommentNode[], sort: CommentSort): CommentNode[] {
	const next = [...roots];
	next.sort((a, b) => {
		const aTime = Date.parse(a.createdAt);
		const bTime = Date.parse(b.createdAt);
		return sort === "recent" ? bTime - aTime : aTime - bTime;
	});
	return next;
}

export function hashAuthorColor(name: string, palette: readonly string[]): string {
	let hash = 0;
	for (let i = 0; i < name.length; i += 1) {
		hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	}
	return palette[hash % palette.length] ?? palette[0] ?? "#64748b";
}

export function authorInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	}
	return name.trim().slice(0, 2).toUpperCase() || "?";
}
