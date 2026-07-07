import { lazyPage } from "./lazyPage";

// v1
export const HomePage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-home" */ "@react-client/features/v1/home/pages/HomePage"
		),
	"HomePage",
);
export const AnketaCreatePage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-anketa-create" */ "@react-client/features/v1/anketaCRUD/pages/AnketaCreatePage"
		),
	"AnketaCreatePage",
);
export const AnketaPreviewPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-anketa-preview" */ "@react-client/features/v1/anketaCRUD/pages/AnketaPreviewPage"
		),
	"AnketaPreviewPage",
);
export const AnketaNewVersionPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-anketa-new-version" */ "@react-client/features/v1/anketaCRUD/pages/AnketaNewVersionPage"
		),
	"AnketaNewVersionPage",
);
export const AnketaClonePage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-anketa-clone" */ "@react-client/features/v1/anketaCRUD/pages/AnketaClonePage"
		),
	"AnketaClonePage",
);
export const CompareReportsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v1-compare-reports" */ "@react-client/features/v1/anketaCompare/pages/CompareReportsPage"
		),
	"CompareReportsPage",
);

// v2
export const V2RegistryPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v2-registry" */ "@react-client/features/v2/home/pages/V2RegistryPage"
		),
	"V2RegistryPage",
);
export const AnketaCreatePageV2 = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v2-anketa-create" */ "@react-client/features/v2/anketaCRUD/pages/AnketaCreatePageV2"
		),
	"AnketaCreatePageV2",
);
export const AnketaPreviewPageV2 = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v2-anketa-preview" */ "@react-client/features/v2/anketaCRUD/pages/AnketaPreviewPageV2"
		),
	"AnketaPreviewPageV2",
);
export const AnketaNewVersionPageV2 = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-v2-anketa-new-version" */ "@react-client/features/v2/anketaCRUD/pages/AnketaNewVersionPageV2"
		),
	"AnketaNewVersionPageV2",
);

// common
export const SettingsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-settings" */ "@react-client/features/settings/pages/SettingsPage"
		),
	"SettingsPage",
);
export const Page404 = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-404" */ "@react-client/routing/common/Page404"
		),
	"Page404",
);

// admin
export const AdminLayout = lazyPage(
	() =>
		import(
			/* webpackChunkName: "layout-admin" */ "@react-client/features/v2/admin/layouts/AdminLayout"
		),
	"AdminLayout",
);
export const AdminV2SchemasPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-schemas" */ "@react-client/features/v2/admin/pages/AdminV2SchemasPage"
		),
	"AdminV2SchemasPage",
);
export const AdminV2GuidePage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-guide" */ "@react-client/features/v2/admin/pages/AdminV2GuidePage"
		),
	"AdminV2GuidePage",
);
export const AdminV2DictionariesPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-dictionaries" */ "@react-client/features/v2/admin/pages/AdminV2DictionariesPage"
		),
	"AdminV2DictionariesPage",
);
export const AdminV2DictionaryDetailPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-dictionary-detail" */ "@react-client/features/v2/admin/pages/AdminV2DictionaryDetailPage"
		),
	"AdminV2DictionaryDetailPage",
);
export const AdminV2TypicalWorksPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-typical-works" */ "@react-client/features/v2/admin/pages/AdminV2TypicalWorksPage"
		),
	"AdminV2TypicalWorksPage",
);
export const AdminV2TypicalWorkDetailPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-typical-work-detail" */ "@react-client/features/v2/admin/pages/AdminV2TypicalWorkDetailPage"
		),
	"AdminV2TypicalWorkDetailPage",
);
export const AdminV2HistoryPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-history" */ "@react-client/features/v2/admin/pages/AdminV2HistoryPage"
		),
	"AdminV2HistoryPage",
);
export const AdminV2TemplateHistoryPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-admin-template-history" */ "@react-client/features/v2/admin/pages/AdminV2TemplateHistoryPage"
		),
	"AdminV2TemplateHistoryPage",
);
export const V2TemplatePreviewPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-template-preview" */ "@react-client/features/v2/admin_constructor/pages/V2TemplatePreviewPage"
		),
	"V2TemplatePreviewPage",
);
export const V2TemplateLogicPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-template-logic" */ "@react-client/features/v2/admin_constructor/pages/V2TemplateLogicPage"
		),
	"V2TemplateLogicPage",
);
export const V2TemplateSchemaEditorPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-template-schema-editor" */ "@react-client/features/v2/admin_constructor/pages/V2TemplateSchemaEditorPage"
		),
	"V2TemplateSchemaEditorPage",
);

// playground
export const PlaygroundPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-playground" */ "@react-client/features/playground/PlaygroundPage"
		),
	"PlaygroundPage",
);

// tracker
export const TrackerProjectsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-projects" */ "@react-client/features/tracker/pages/TrackerProjectsPage"
		),
	"TrackerProjectsPage",
);
export const TrackerBoardsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-boards" */ "@react-client/features/tracker/pages/TrackerBoardsPage"
		),
	"TrackerBoardsPage",
);
export const TrackerTasksPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-tasks" */ "@react-client/features/tracker/pages/TrackerTasksPage"
		),
	"TrackerTasksPage",
);
export const TrackerGanttPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-gantt" */ "@react-client/features/tracker/pages/TrackerGanttPage"
		),
	"TrackerGanttPage",
);
export const TrackerAssigneesPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-assignees" */ "@react-client/features/tracker/pages/TrackerAssigneesPage"
		),
	"TrackerAssigneesPage",
);
export const TrackerCustomersPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-customers" */ "@react-client/features/tracker/pages/TrackerCustomersPage"
		),
	"TrackerCustomersPage",
);
export const TrackerSupersprintsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-supersprints" */ "@react-client/features/tracker/pages/TrackerSupersprintsPage"
		),
	"TrackerSupersprintsPage",
);
export const TrackerSprintsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-sprints" */ "@react-client/features/tracker/pages/TrackerSprintsPage"
		),
	"TrackerSprintsPage",
);
export const TrackerStreamsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-streams" */ "@react-client/features/tracker/pages/TrackerStreamsPage"
		),
	"TrackerStreamsPage",
);
export const TrackerSettingsPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-settings" */ "@react-client/features/tracker/pages/TrackerSettingsPage"
		),
	"TrackerSettingsPage",
);
export const TrackerBoardHistoryPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-tracker-board-history" */ "@react-client/features/tracker/pages/TrackerBoardHistoryPage"
		),
	"TrackerBoardHistoryPage",
);
export const KanbanBoardPage = lazyPage(
	() =>
		import(
			/* webpackChunkName: "page-kanban-board" */ "@react-client/features/kanban-board/pages/KanbanBoardPage"
		),
	"KanbanBoardPage",
);
export const KanbanTaskPage = lazyPage<{ mode?: "create" }>(
	() =>
		import(
			/* webpackChunkName: "page-kanban-task" */ "@react-client/features/kanban-board/pages/KanbanTaskPage"
		),
	"KanbanTaskPage",
);
