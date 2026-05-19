export const useAppVersion = () => {
	const match = `window.location.pathname`.match(/^\/([vV]\d+)/);
	return match ? match[1].toLowerCase() : "v1"; // по умолчанию v1
};
