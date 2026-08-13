import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Query,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import {
	V2MasterRegistryImportService,
	type V2MasterRegistryImportOverrides,
	type V2MasterRegistryImportResultDto,
} from "../services/v2-master-registry-import.service";

function parseOverridesBody(
	raw?: string | V2MasterRegistryImportOverrides,
): V2MasterRegistryImportOverrides | undefined {
	if (raw == null || raw === "") return undefined;
	if (typeof raw === "object") return raw;
	try {
		const parsed = JSON.parse(raw) as V2MasterRegistryImportOverrides;
		if (!parsed || typeof parsed !== "object") {
			throw new BadRequestException("overrides: ожидается JSON-объект");
		}
		return parsed;
	} catch (error) {
		if (error instanceof BadRequestException) throw error;
		throw new BadRequestException("overrides: некорректный JSON");
	}
}

@ApiBearerAuth("JWT-auth")
@ApiTags("v2-master-registry-import")
@Controller("v2/questionnaires")
export class V2MasterRegistryImportController {
	constructor(
		private readonly importService: V2MasterRegistryImportService,
	) {}

	@Post("import-master-registry")
	@DomainRoles("appadmin", "sacfg")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	@ApiQuery({
		name: "dryRun",
		required: false,
		description:
			"true (по умолчанию) — только разбор и превью; false — создать анкеты",
	})
	@ApiQuery({
		name: "templateId",
		required: false,
		description: "UUID шаблона; иначе — актуальная схема",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				file: { type: "string", format: "binary" },
				overrides: {
					type: "string",
					description:
						'JSON: { "departments": { "ДФУ": "Департамент финансового урегулирования" }, "streams": {}, "production": {} }',
				},
				masterRows: {
					type: "string",
					description:
						"JSON-массив номеров строк Excel (1-based) для выборочной загрузки",
				},
			},
		},
	})
	@ApiOperation({
		summary:
			"Импорт готовых анкет из Excel «Оценка Инициативы» (мастер-реестр)",
		description:
			"Читает видимый лист «Оценка Инициативы», маппит колонки по реестру 2026.08.10 и создаёт анкеты. Скрытые листы пропускаются. Поле overrides — ручные сопоставления из dry-run; masterRows — фильтр строк.",
	})
	async importMasterRegistry(
		@UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
		@Query("dryRun") dryRunRaw?: string,
		@Query("templateId") templateId?: string,
		@Body("overrides") overridesRaw?: string,
		@Body("masterRows") masterRowsRaw?: string,
		@CurrentUser() user?: Record<string, unknown>,
	): Promise<V2MasterRegistryImportResultDto> {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}
		const name = String(file.originalname ?? "").toLowerCase();
		if (name && !name.endsWith(".xlsx") && !name.endsWith(".xlsm")) {
			throw new BadRequestException("Ожидается файл .xlsx");
		}

		const dryRun = dryRunRaw !== "false" && dryRunRaw !== "0";
		const overrides = parseOverridesBody(overridesRaw);
		const masterRows = parseMasterRowsBody(masterRowsRaw);
		return this.importService.importFromXlsx(
			file.buffer,
			{
				dryRun,
				templateId: templateId?.trim() || undefined,
				overrides,
				masterRows,
			},
			{
				preferred_username:
					typeof user?.preferred_username === "string"
						? user.preferred_username
						: typeof user?.username === "string"
							? user.username
							: "import",
				username:
					typeof user?.username === "string" ? user.username : undefined,
				groups: [],
			},
		);
	}
}

function parseMasterRowsBody(raw?: string): number[] | undefined {
	if (raw == null || raw === "") return undefined;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			throw new BadRequestException("masterRows: ожидается JSON-массив чисел");
		}
		const rows = parsed
			.map((n) => Number(n))
			.filter((n) => Number.isFinite(n) && n > 0)
			.map((n) => Math.trunc(n));
		return rows.length > 0 ? [...new Set(rows)] : undefined;
	} catch (error) {
		if (error instanceof BadRequestException) throw error;
		throw new BadRequestException("masterRows: некорректный JSON");
	}
}
