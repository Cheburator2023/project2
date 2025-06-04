import { Type } from "class-transformer";
import {
	IsArray,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";

class UncertaintyItemDto {
	@IsNotEmpty()
	@IsString()
	itemType: string;

	@IsNotEmpty()
	@IsString()
	probability: string;

	@IsNotEmpty()
	@IsString()
	influence: string;
}

class AlgorithmComplexityDto {
	@IsNotEmpty()
	@IsString()
	algorithmType: string;
}

class DeploymentChannelDto {
	@IsNotEmpty()
	@IsString()
	deploymentChannel: string;
}

export class CreateCalculationDto {
	@IsNumber()
	@IsNotEmpty()
	modelsCount: number;

	@IsNumber()
	@IsNotEmpty()
	setupComplexity: number;

	@IsString()
	@IsNotEmpty()
	initiativeTimeline: string;

	@IsString()
	@IsNotEmpty()
	initiativeCost: string;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UncertaintyItemDto)
	generalUncertainty: UncertaintyItemDto[];

	@IsString()
	@IsNotEmpty()
	readyPromReports: string;

	@IsString()
	@IsOptional()
	assessedInitiativesCount?: string;

	@IsString()
	@IsNotEmpty()
	dataSourcesCount: string;

	@IsString()
	@IsNotEmpty()
	pilotModelRequired: string;

	@ValidateNested()
	@Type(() => AlgorithmComplexityDto)
	algorithmComplexity: AlgorithmComplexityDto;

	@IsString()
	@IsNotEmpty()
	pilotSupportRequired: string;

	@IsString()
	@IsNotEmpty()
	autoMlRequired: string;

	@IsString()
	@IsNotEmpty()
	productionAdditionalReports: string;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => DeploymentChannelDto)
	productionDeploymentChannels: DeploymentChannelDto[];

	@IsNumber()
	@IsNotEmpty()
	finalCoefficient: number;
}
