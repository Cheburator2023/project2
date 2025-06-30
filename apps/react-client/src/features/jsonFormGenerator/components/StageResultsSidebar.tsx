import React from "react";

interface StageResultsSidebarProps {
	results?: {
		stage01: number;
		stage02: number;
		stage03: number;
		stage05A: number;
		stage05: number;
		amlDrafting: number;
		stage05B: number;
		stage07: number;
		stage09: number;
		amlEnforcement: number;
	};
	coefficients?: Record<string, number | string>;
}

const stageNames: Record<
	keyof NonNullable<StageResultsSidebarProps["results"]>,
	string
> = {
	stage01: "Stage 01: Постановка задачи",
	stage02: "Stage 02: Поиск данных",
	stage03: "Stage 03: Построение витрины для разработки",
	stage05A: "Stage 05A: Разработка пилотной модели (MVP)",
	stage05: "Stage 05: Разработка модели",
	amlDrafting: "AML Разработка",
	stage05B: "Stage 05B: Пилотирование модели",
	stage07: "Stage 07: Разработка витрины для применения модели",
	stage09: "Stage 09: Адаптация и внедрение модели",
	amlEnforcement: "AML Внедрение",
};

const coefficientNames: Record<string, string> = {
	modelsCountCoefficient: "Коэффициент количества моделей",
	setupComplexityCoefficient: "Коэффициент сложности постановки",
	generalUncertaintyCoefficient: "Коэффициент общей неопределённости",
	readyPromReportsCoefficient: "Коэффициент готовых пром витрин",
	algorithmComplexityCoefficient: "Коэффициент сложности алгоритма",
	dataSourcesCountCoefficient: "Коэффициент количества источников",
	pilotModelRequired: "Пилотная модель требуется",
	pilotSupportRequired: "Требуется поддержка пилота",
	autoMlRequired: "Требуется AutoML",
	productionAdditionalReportsCoefficient: "Коэффициент доп. витрин",
	deploymentChannelsCoefficient: "Коэффициент каналов внедрения",
};

const StageResultsSidebar: React.FC<StageResultsSidebarProps> = ({
	results = {},
	coefficients = {},
}) => {
	return (
		<aside
			style={{
				minWidth: 320,
				padding: 24,
				background: "#f7f7f7",
				borderLeft: "1px solid #eee",
				height: "100%",
			}}
		>
			<h3>Промежуточные коэффициенты</h3>
			<ul style={{ listStyle: "none", padding: 0, marginBottom: 32 }}>
				{Object.entries(coefficients).map(([key, value]) => (
					<li key={key} style={{ marginBottom: 8 }}>
						<span>{coefficientNames[key] || key}:</span>{" "}
						<strong>{value}</strong>
					</li>
				))}
			</ul>
			<h3>Результаты этапов</h3>
			<ul style={{ listStyle: "none", padding: 0 }}>
				{Object.entries(results).map(([key, value]: any) => (
					<li key={key} style={{ marginBottom: 16 }}>
						<strong>
							{stageNames[key as keyof typeof stageNames] || key}:
						</strong>{" "}
						{value}
					</li>
				))}
			</ul>
		</aside>
	);
};

export default StageResultsSidebar;
