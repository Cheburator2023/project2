import {
	BadRequestException,
	Controller,
	Get,
	HttpStatus,
	Post,
	Query,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import {
	SnapshotIntegrityError,
	SnapshotSchemaError,
	V2DataTransferService,
} from "../services/v2-data-transfer.service";
import {
	buildV2DataTransferExportFilename,
	parseV2DataTransferSections,
} from "@smart-anketa/api-contract";
import type { V2DataImportMode } from "../utils/v2-data-snapshot.util";

@ApiBearerAuth("JWT-auth")
@ApiTags("v2-data-transfer")
@Controller("v2/data-transfer")
export class V2DataTransferController {
	constructor(private readonly transferService: V2DataTransferService) {}

	@Get("export")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Экспорт всех данных v2",
		description:
			"Выгружает шаблоны, справочники, типовые работы и анкеты в JSON-снапшот для переноса между стендами. Аудит v2 не включается.",
	})
	@ApiQuery({
		name: "sections",
		required: false,
		description:
			"Разделы через запятую: templates, dictionaries, typicalWorks, questionnaires. По умолчанию — все.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/json": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSnapshot(
		@Res() res: Response,
		@Query("sections") sectionsRaw?: string,
	): Promise<void> {
		const sections = parseV2DataTransferSections(sectionsRaw);
		const buffer = await this.transferService.exportSnapshot(sections);
		const filename = buildV2DataTransferExportFilename(sections);
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename}"`,
		);
		res.end(buffer);
	}

	@Post("import")
	@DomainRoles("appadmin", "sacfg")
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	@ApiQuery({
		name: "mode",
		required: false,
		enum: ["merge", "replace"],
		description:
			"merge — добавить новые записи, пропустить конфликты по code/catalogKey/readableId; replace — полностью заменить данные v2 (кроме аудита)",
	})
	@ApiQuery({
		name: "sections",
		required: false,
		description:
			"Разделы через запятую: templates, dictionaries, typicalWorks, questionnaires. По умолчанию — все.",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				file: { type: "string", format: "binary" },
			},
		},
	})
	@ApiOperation({ summary: "Импорт снапшота данных v2 из JSON" })
	async importSnapshot(
		@UploadedFile() file?: { buffer: Buffer },
		@Query("mode") mode?: string,
		@Query("sections") sectionsRaw?: string,
	) {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}

		const importMode: V2DataImportMode =
			mode === "replace" ? "replace" : "merge";
		const sections = parseV2DataTransferSections(sectionsRaw);

		try {
			return await this.transferService.importSnapshot(
				file.buffer,
				importMode,
				sections,
			);
		} catch (error) {
			if (error instanceof SnapshotIntegrityError) {
				throw new BadRequestException({
					message: "Контрольная сумма файла не совпадает",
					expectedSha256: error.expectedSha256,
					actualSha256: error.actualSha256,
				});
			}
			if (error instanceof SnapshotSchemaError) {
				throw new BadRequestException(error.message);
			}
			if (error instanceof Error) {
				throw new BadRequestException(error.message);
			}
			throw error;
		}
	}
}
