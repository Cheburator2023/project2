import {
	apiClient,
	API_DEFAULT_TIMEOUT_MS,
} from "@react-client/common/api/helpers/apiClient";
import { useUserStore } from "@react-client/common/store/userStore";
import {
	connectV2EditLockSocket,
	waitForV2TemplateReady,
} from "@react-client/features/v2/anketaCRUD/utils/v2EditLockSocket";
import type {
	V2TemplateVersionDto,
	V2TypicalWorkListResponseDto,
} from "@smart-anketa/api-contract";

/**
 * В `v2-factory-template-typical-works.registry.json` сейчас 113 работ.
 * Ждём полный набор — иначе UI открывает редактор и дергает schema-field-sync/bulk,
 * пока фоновый seed ещё пишет строки (гонка → 500).
 */
const FACTORY_TYPICAL_WORKS_MIN_COUNT = 113;
const MAX_WAIT_MS = 600_000;

async function listTemplateVersions(
	templateId: string,
): Promise<V2TemplateVersionDto[]> {
	return apiClient<V2TemplateVersionDto[]>({
		url: `/v2/templates/${templateId}/versions`,
		method: "GET",
		timeout: API_DEFAULT_TIMEOUT_MS,
	});
}

async function listTemplateTypicalWorks(
	templateId: string,
): Promise<V2TypicalWorkListResponseDto> {
	return apiClient<V2TypicalWorkListResponseDto>({
		url: `/v2/works?templateId=${encodeURIComponent(templateId)}`,
		method: "GET",
		timeout: API_DEFAULT_TIMEOUT_MS,
	});
}

async function isAlreadyReady(
	templateId: string,
	withoutTypicalWorks?: boolean,
): Promise<boolean> {
	const versions = await listTemplateVersions(templateId);
	if (!versions.some((version) => version.status === "draft")) {
		return false;
	}
	if (withoutTypicalWorks) {
		return true;
	}
	const works = await listTemplateTypicalWorks(templateId);
	return works.total >= FACTORY_TYPICAL_WORKS_MIN_COUNT;
}

function isAbortError(error: unknown): boolean {
	return (
		(error instanceof DOMException && error.name === "AbortError") ||
		(error instanceof Error && error.name === "AbortError")
	);
}

export async function waitForV2FactoryTemplateReady(
	templateId: string,
	options?: { withoutTypicalWorks?: boolean },
): Promise<boolean> {
	connectV2EditLockSocket(
		useUserStore.getState().username?.trim() || "Пользователь",
	);
	const ac = new AbortController();
	const pending = waitForV2TemplateReady(templateId, {
		signal: ac.signal,
		timeoutMs: MAX_WAIT_MS,
	});

	try {
		if (await isAlreadyReady(templateId, options?.withoutTypicalWorks)) {
			ac.abort();
			return true;
		}
		const payload = await pending;
		return payload.typicalWorksReady && !payload.error;
	} catch (error) {
		if (ac.signal.aborted || isAbortError(error)) {
			return true;
		}
		if (
			error instanceof Error &&
			error.message === "Не удалось дождаться загрузки типовых работ"
		) {
			return false;
		}
		ac.abort();
		throw error;
	}
}
