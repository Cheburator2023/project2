import {
	apiClient,
	API_DEFAULT_TIMEOUT_MS,
} from "@react-client/common/api/helpers/apiClient";
import type {
	V2TemplateVersionDto,
	V2TypicalWorkListResponseDto,
} from "@smart-anketa/api-contract";

/** В реестре заводских типовых работ 83 записи; допускаем небольшой запас на гонки. */
const FACTORY_TYPICAL_WORKS_MIN_COUNT = 70;
const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS = 600_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

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

async function waitForDraftVersion(templateId: string): Promise<boolean> {
	const deadline = Date.now() + MAX_WAIT_MS;
	while (Date.now() < deadline) {
		const versions = await listTemplateVersions(templateId);
		if (versions.some((version) => version.status === "draft")) {
			return true;
		}
		await sleep(POLL_INTERVAL_MS);
	}
	return false;
}

async function waitForTypicalWorks(templateId: string): Promise<boolean> {
	const deadline = Date.now() + MAX_WAIT_MS;
	while (Date.now() < deadline) {
		const works = await listTemplateTypicalWorks(templateId);
		if (works.total >= FACTORY_TYPICAL_WORKS_MIN_COUNT) {
			return true;
		}
		await sleep(POLL_INTERVAL_MS);
	}
	return false;
}

export async function waitForV2FactoryTemplateReady(
	templateId: string,
	options?: { withoutTypicalWorks?: boolean },
): Promise<boolean> {
	const hasDraft = await waitForDraftVersion(templateId);
	if (!hasDraft) {
		return false;
	}
	if (options?.withoutTypicalWorks) {
		return true;
	}
	return waitForTypicalWorks(templateId);
}
