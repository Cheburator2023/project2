import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	filterTypicalWorkParameterValuesActiveOnDate,
	type V2ParameterDependencyListResponseDto,
	type V2TypicalWorkParameterListResponseDto,
	type WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { V2_DOC_CATALOG } from "../constants/v2-doc-catalog";
import { V2TypicalWorkParamEntity } from "../entities/v2-typical-work-param.entity";
import { V2TypicalWorkParamValueEntity } from "../entities/v2-typical-work-param-value.entity";
import {
	DEFAULT_NORM_VALID_FROM,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";

@Injectable()
export class V2TypicalWorkParamCatalogService implements OnModuleInit {
	private readonly logger = new Logger(V2TypicalWorkParamCatalogService.name);

	constructor(
		@InjectRepository(V2TypicalWorkParamEntity)
		private readonly paramRepository: Repository<V2TypicalWorkParamEntity>,
		@InjectRepository(V2TypicalWorkParamValueEntity)
		private readonly valueRepository: Repository<V2TypicalWorkParamValueEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		await this.ensureSeededFromDocCatalog();
	}

	async ensureSeededFromDocCatalog(): Promise<void> {
		let created = 0;
		for (const dict of V2_DOC_CATALOG.dictionaries) {
			const code = slugParamCode(dict.name);
			let param = await this.paramRepository.findOne({ where: { code } });
			if (!param) {
				param = await this.paramRepository.save(
					this.paramRepository.create({
						code,
						name: dict.name,
						description: dict.comments?.trim() || dict.attributes?.trim() || null,
					}),
				);
				created++;
			}

			const existingValueCount = await this.valueRepository.count({
				where: { paramId: param.id },
			});
			if (existingValueCount > 0) continue;

			const values = dict.values.map((value, index) =>
				this.valueRepository.create({
					paramId: param!.id,
					code: slugParamCode(value.label),
					label: value.label,
					coefficient:
						value.coeff == null || !Number.isFinite(value.coeff)
							? null
							: String(value.coeff),
					sortOrder: index,
					validFrom: DEFAULT_NORM_VALID_FROM,
					validTo: null,
				}),
			);
			if (values.length > 0) {
				await this.valueRepository.save(values);
			}
		}
		if (created > 0) {
			this.logger.log(`Seeded ${created} typical-work parameter catalogs`);
		}
	}

	async listParameters(
		atDate = new Date().toISOString().slice(0, 10),
	): Promise<V2TypicalWorkParameterListResponseDto> {
		const params = await this.paramRepository.find({
			relations: { values: true },
			order: { code: "ASC", values: { sortOrder: "ASC" } },
		});
		return {
			items: params.map((param) => ({
				code: param.code,
				name: param.name,
				description: param.description,
				values: filterTypicalWorkParameterValuesActiveOnDate(
					param.values ?? [],
					atDate,
				).map((value) => ({
					code: value.code,
					label: value.label,
					coefficient:
						value.coefficient == null ? null : Number(value.coefficient),
					sortOrder: value.sortOrder,
					validFrom: value.validFrom,
					validTo: value.validTo,
				})),
			})),
		};
	}

	async listParameterDependencies(): Promise<V2ParameterDependencyListResponseDto> {
		const params = await this.paramRepository.find({ order: { code: "ASC" } });
		return {
			items: params
				.filter((param) => param.description?.trim())
				.map((param) => ({
					paramCode: param.code,
					paramName: param.name,
					dependsOnParamCode: null,
					dependsOnParamName: null,
					description: param.description,
				})),
		};
	}

	async listTriggerStatusCatalog(
		atDate?: string,
	): Promise<WorkTriggerStatusCatalogParam[]> {
		const params = await this.paramRepository.find({
			relations: { values: true },
			order: { code: "ASC", values: { sortOrder: "ASC" } },
		});
		return params.map((param) => ({
			code: param.code,
			values: (atDate
				? filterTypicalWorkParameterValuesActiveOnDate(
						param.values ?? [],
						atDate,
					)
				: (param.values ?? [])
			).map((value) => ({
				code: value.code,
				label: value.label,
				validFrom: value.validFrom,
				validTo: value.validTo,
			})),
		}));
	}
}
