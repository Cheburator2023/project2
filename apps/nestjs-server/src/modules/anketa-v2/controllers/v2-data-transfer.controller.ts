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
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import {
	SnapshotIntegrityError,
	SnapshotSchemaError,
	V2DataTransferService,
} from "../services/v2-data-transfer.service";
import type { V2DataImportMode } from "../utils/v2-data-snapshot.util";

@ApiBearerAuth("JWT-auth")
@ApiTags("v2-data-transfer")
@Controller("v2/data-transfer")
export class V2DataTransferController {
	constructor(private readonly transferService: V2DataTransferService) {}

	@Get("export")
	@RealmRole(Permission.ANKETA_ADMIN_PANEL)
	@ApiOperation({
		summary: "Экспорт всех данных v2",
		description:
			"Выгружает шаблоны, справочники, типовые работы и анкеты в JSON-снапшот для переноса между стендами. Аудит v2 не включается.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		content: {
			"application/json": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	async exportSnapshot(@Res() res: Response): Promise<void> {
		const buffer = await this.transferService.exportSnapshot();
		const date = new Date().toISOString().slice(0, 10);
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=smart-anketa-v2-${date}.json`,
		);
		res.end(buffer);
	}

	@Post("import")
	@RealmRole(Permission.ANKETA_ADMIN_PANEL)
	@UseInterceptors(FileInterceptor("file"))
	@ApiConsumes("multipart/form-data")
	@ApiQuery({
		name: "mode",
		required: false,
		enum: ["merge", "replace"],
		description:
			"merge — добавить новые записи, пропустить конфликты по code/catalogKey/readableId; replace — полностью заменить данные v2 (кроме аудита)",
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
	) {
		if (!file?.buffer?.length) {
			throw new BadRequestException("Файл не передан");
		}

		const importMode: V2DataImportMode =
			mode === "replace" ? "replace" : "merge";

		try {
			return await this.transferService.importSnapshot(
				file.buffer,
				importMode,
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
