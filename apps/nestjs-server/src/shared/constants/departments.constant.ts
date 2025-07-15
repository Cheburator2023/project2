export const DEPARTMENTS = {
	KIB_SMB: "Управление моделирования КИБ и СМБ",
	PARTNERSHIPS_IT: "Управление моделирования партнерств и ИТ-процессов",
	RB: "Управление моделирования РБ",
	ML_ALGORITHMS: "Управление перспективных алгоритмов машинного обучения",
	PROCESS_FINANCIAL: "Управление процессных и финансовых моделей",
} as const;

export type Department = (typeof DEPARTMENTS)[keyof typeof DEPARTMENTS];
