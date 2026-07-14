import {Permission} from "@react-client/types/roles";

export type AppRouteConfig = {
	rootPath: string;
	name: string;
	permission?: Permission;
	disabled?: boolean;
	devOnly?: boolean;
	/** Пункт основного сайдменю */
	showInNavbar?: boolean;
	navbar?: {
		group?: "main" | "adminV2" | "dev" | "tracker";
		order?: number;
	};
	/** Короткий заголовок для крошек на вложенных экранах */
	shortName?: string;
};
