export const STREAMS = {
	KIB_SMB: "Разработка моделей для КМБ и КСБ",
	PARTNERSHIPS_IT_IT: "Модели партнерств и платформы больших данных",
	PARTNERSHIPS_IT_RND: "Моделирование RnD",
	RB: "Моделирование РБ",
	ML_ALGORITHMS: "Моделирование RnD",
	PROCESS_FINANCIAL: "Финансовое моделирование",
} as const;

export type Stream = (typeof STREAMS)[keyof typeof STREAMS];
