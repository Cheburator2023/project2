export const STREAM_FILTERED_ROLES = [
	"ds",
	"de",
	"sarep",
	"data_expert",
	"mipm_stream",
	"modelops",
] as const;

export type StreamFilteredRole = (typeof STREAM_FILTERED_ROLES)[number];
