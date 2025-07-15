export const STREAM_FILTERED_ROLES = [
	"ds",
	"ds_lead",
	"de",
	"de_lead",
	"modelops",
	"modelops_lead",
] as const;

export type StreamFilteredRole = (typeof STREAM_FILTERED_ROLES)[number];
