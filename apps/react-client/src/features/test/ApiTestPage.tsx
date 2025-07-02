import axios from "axios";
import React, { useState } from "react";

export const ApiTestPage: React.FC = () => {
	const [testResult, setTestResult] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	const testLocalServer = async () => {
		setIsLoading(true);
		setTestResult("Тестируем локальный сервер...");

		try {
			// Тестируем локальный сервер
			const response = await axios.get(
				"http://localhost:3000/calculation/all/list",
				{
					timeout: 10000,
					withCredentials: true,
				},
			);

			setTestResult(
				`✅ Локальный сервер работает! Статус: ${response.status}, Данных: ${response.data?.length || 0} записей`,
			);
			console.log("Local response:", response.data);
		} catch (error: any) {
			const errorMessage = error.response
				? `❌ HTTP ${error.response.status}: ${error.response.statusText}`
				: `❌ Ошибка сети: ${error.message}`;

			setTestResult(errorMessage);
			console.error("Local error details:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const testGetRequest = async () => {
		setIsLoading(true);
		setTestResult("Тестируем GET запрос...");

		try {
			// Тестируем прямой axios запрос
			const response = await axios.get(
				"https://smart-anketa-api-sumcore.sumd.dk1-sumd01.innodev.local/calculation/all/list",
				{
					timeout: 10000,
					withCredentials: true,
					// НЕ добавляем Content-Type для GET запроса
				},
			);

			setTestResult(
				`✅ Успешно! Статус: ${response.status}, Данных: ${response.data?.length || 0} записей`,
			);
			console.log("Response:", response.data);
		} catch (error: any) {
			const errorMessage = error.response
				? `❌ HTTP ${error.response.status}: ${error.response.statusText}`
				: `❌ Ошибка сети: ${error.message}`;

			setTestResult(errorMessage);
			console.error("Error details:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const testWithAuth = async () => {
		setIsLoading(true);
		setTestResult("Тестируем GET запрос с авторизацией...");

		try {
			// Получаем токен из store (если есть)
			const token = localStorage.getItem("accessToken") || "test-token";

			const response = await axios.get(
				"https://smart-anketa-api-sumcore.sumd.dk1-sumd01.innodev.local/calculation/all/list",
				{
					timeout: 10000,
					withCredentials: true,
					headers: {
						Authorization: `Bearer ${token}`,
						// НЕ добавляем Content-Type для GET
					},
				},
			);

			setTestResult(
				`✅ С авторизацией! Статус: ${response.status}, Данных: ${response.data?.length || 0} записей`,
			);
		} catch (error: any) {
			const errorMessage = error.response
				? `❌ HTTP ${error.response.status}: ${error.response.statusText}`
				: `❌ Ошибка сети: ${error.message}`;

			setTestResult(errorMessage);
			console.error("Auth error details:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
			<h1>🧪 Тест API - CORS и GET запросы</h1>

			<div style={{ marginBottom: "20px" }}>
				<h3>URL для тестирования:</h3>
				<code
					style={{ background: "#f5f5f5", padding: "10px", display: "block" }}
				>
					https://smart-anketa-api-sumcore.sumd.dk1-sumd01.innodev.local/calculation/all/list
				</code>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<button
					onClick={testLocalServer}
					disabled={isLoading}
					style={{
						marginRight: "10px",
						padding: "10px 20px",
						backgroundColor: "#ffc107",
						color: "black",
						border: "none",
						borderRadius: "5px",
						cursor: isLoading ? "not-allowed" : "pointer",
					}}
				>
					{isLoading ? "Тестируем..." : "Тест локального сервера"}
				</button>

				<button
					onClick={testGetRequest}
					disabled={isLoading}
					style={{
						marginRight: "10px",
						padding: "10px 20px",
						backgroundColor: "#007bff",
						color: "white",
						border: "none",
						borderRadius: "5px",
						cursor: isLoading ? "not-allowed" : "pointer",
					}}
				>
					{isLoading ? "Тестируем..." : "Тест без авторизации"}
				</button>

				<button
					onClick={testWithAuth}
					disabled={isLoading}
					style={{
						padding: "10px 20px",
						backgroundColor: "#28a745",
						color: "white",
						border: "none",
						borderRadius: "5px",
						cursor: isLoading ? "not-allowed" : "pointer",
					}}
				>
					{isLoading ? "Тестируем..." : "Тест с авторизацией"}
				</button>
			</div>

			<div
				style={{
					marginTop: "20px",
					padding: "15px",
					backgroundColor: "#f8f9fa",
					borderRadius: "5px",
					border: "1px solid #dee2e6",
				}}
			>
				<h3>Результат теста:</h3>
				<pre
					style={{
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
						margin: 0,
						fontSize: "14px",
					}}
				>
					{testResult || "Нажмите кнопку для тестирования"}
				</pre>
			</div>

			<div style={{ marginTop: "20px" }}>
				<h3>Что проверяем:</h3>
				<ul>
					<li>✅ CORS ошибки</li>
					<li>✅ Content-Type для GET запросов</li>
					<li>✅ Авторизация</li>
					<li>✅ Сетевые ошибки</li>
					<li>✅ Доступность сервера</li>
				</ul>
			</div>
		</div>
	);
};
