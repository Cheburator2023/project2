export const STREAM_FILTERED_ROLES = [
	"ds",
	"ds_lead",
] as const;

export type StreamFilteredRole = (typeof STREAM_FILTERED_ROLES)[number];
