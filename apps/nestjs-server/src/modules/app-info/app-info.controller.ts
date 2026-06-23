import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AppVersionDto } from "@smart-anketa/api-contract";
import { Public } from "../../shared/decorators/public.decorator";
import { AppInfoService } from "./app-info.service";

@ApiTags("app")
@Controller("app")
export class AppInfoController {
	constructor(private readonly appInfoService: AppInfoService) {}

	@Public()
	@Get("version")
	@ApiOkResponse({ description: "Application version info" })
	getVersion(): AppVersionDto {
		return this.appInfoService.getVersion();
	}
}
