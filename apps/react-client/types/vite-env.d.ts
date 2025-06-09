/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
	readonly VITE_APP_NAME?: string;
	readonly VITE_MOCKED_REQUESTS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
