import {
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	filterTypicalWorkParameterValuesActiveOnDate,
	type CreateV2TypicalWorkParameterRequestDto,
	type CreateV2TypicalWorkParameterValueRequestDto,
	type UpdateV2TypicalWorkParameterRequestDto,
	type UpdateV2TypicalWorkParameterValueRequestDto,
	type V2ParameterDependencyListResponseDto,
	type V2TypicalWorkParameterDto,
	type V2TypicalWorkParameterListResponseDto,
	type V2TypicalWorkParameterValueDto,
	type WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../constants/v2-factory-typical-works-catalog";
import { V2TypicalWorkParamEntity } from "../entities/v2-typical-work-param.entity";
import { V2TypicalWorkParamValueEntity } from "../entities/v2-typical-work-param-value.entity";
import {
	DEFAULT_NORM_VALID_FROM,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";

function uniqueParamValueCode(label: string, seen: Set<string>): string {
	const base = slugParamCode(label) || "value";
	let code = base.slice(0, 120);
	let counter = 2;
	while (seen.has(code)) {
		const suffix = `_${counter}`;
		code = `${base.slice(0, 120 - suffix.length)}${suffix}`;
		counter++;
	}
	seen.add(code);
	return code;
}

function normalizeCatalogCode(raw: string, fallbackSource: string): string {
	const code = (raw.trim() || slugParamCode(fallbackSource)).slice(0, 120);
	if (!code) {
		throw new ConflictException("Код справочника обязателен");
	}
	if (!/^[a-zа-я0-9_]+$/i.test(code)) {
		throw new ConflictException(
			"Код может содержать только буквы, цифры и подчёркивание",
		);
	}
	return code;
}

function normalizeIsoDate(value: string, fieldName: string): string {
	const date = value.trim().slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw new ConflictException(`${fieldName}: укажите дату в формате YYYY-MM-DD`);
	}
	return date;
}

function normalizeCoefficient(value: number | null | undefined): string | null {
	if (value == null) return null;
	if (!Number.isFinite(value) || value < 0) {
		throw new ConflictException("Коэффициент должен быть неотрицательным числом");
	}
	return String(Math.round(value * 100) / 100);
}

function isNumericLabel(label: string): boolean {
	const trimmed = label.trim();
	return trimmed !== "" && !Number.isNaN(Number(trimmed));
}

function computeNumeric(values: V2TypicalWorkParamValueEntity[]): boolean {
	if (values.length === 0) return false;
	return values.every((v) => isNumericLabel(v.label));
}

function toParamDto(param: V2TypicalWorkParamEntity): V2TypicalWorkParameterDto {
	const values = param.values ?? [];
	return {
		id: param.id,
		code: param.code,
		name: param.name,
		description: param.description,
		numeric: computeNumeric(values),
		values: values.map(toValueDto),
	};
}

function toValueDto(
	value: V2TypicalWorkParamValueEntity,
): V2TypicalWorkParameterValueDto {
	return {
		id: value.id,
		code: value.code,
		label: value.label,
		coefficient: value.coefficient == null ? null : Number(value.coefficient),
		sortOrder: value.sortOrder,
		validFrom: value.validFrom,
		validTo: value.validTo,
	};
}

function isPostgresUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
}

@Injectable()
export class V2TypicalWorkParamCatalogService {
	private readonly logger = new Logger(V2TypicalWorkParamCatalogService.name);
	private seedingPromise: Promise<void> | null = null;

	constructor(
		@InjectRepository(V2TypicalWorkParamEntity)
		private readonly paramRepository: Repository<V2TypicalWorkParamEntity>,
		@InjectRepository(V2TypicalWorkParamValueEntity)
		private readonly valueRepository: Repository<V2TypicalWorkParamValueEntity>,
	) {}

	async ensureSeededFromFactorySnapshot(): Promise<void> {
		if (this.seedingPromise) {
			return this.seedingPromise;
		}
		this.seedingPromise = this.runEnsureSeededFromFactorySnapshot().finally(() => {
			this.seedingPromise = null;
		});
		return this.seedingPromise;
	}

	/** @deprecated Use ensureSeededFromFactorySnapshot */
	async ensureSeededFromDocCatalog(): Promise<void> {
		return this.ensureSeededFromFactorySnapshot();
	}

	private async runEnsureSeededFromFactorySnapshot(): Promise<void> {
		let created = 0;
		for (const dict of V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries) {
			const code = slugParamCode(dict.name);
			let param = await this.paramRepository.findOne({ where: { code } });
			if (!param) {
				try {
					param = await this.paramRepository.save(
						this.paramRepository.create({
							code,
							name: dict.name,
							description:
								dict.comments?.trim() || dict.attributes?.trim() || null,
						}),
					);
					created++;
				} catch (error) {
					if (!isPostgresUniqueViolation(error)) throw error;
					param = await this.paramRepository.findOne({ where: { code } });
				}
			}
			if (!param) continue;

			const existingValueCount = await this.valueRepository.count({
				where: { paramId: param.id },
			});
			if (existingValueCount > 0) continue;

			const seenValueCodes = new Set<string>();
			const values = dict.values.map((value, index) => {
				const valueCode = uniqueParamValueCode(value.label, seenValueCodes);
				return this.valueRepository.create({
					paramId: param.id,
					code: valueCode,
					label: value.label,
					coefficient:
						value.coeff == null || !Number.isFinite(value.coeff)
							? null
							: String(value.coeff),
					sortOrder: index,
					validFrom: DEFAULT_NORM_VALID_FROM,
					validTo: null,
				});
			});
			if (values.length === 0) continue;

			try {
				await this.valueRepository.save(values);
			} catch (error) {
				if (!isPostgresUniqueViolation(error)) throw error;
				this.logger.debug(
					`Parameter values for ${code} already seeded (concurrent startup)`,
				);
			}
		}
		if (created > 0) {
			this.logger.log(`Seeded ${created} typical-work parameter catalogs`);
		}
	}

	async listParameters(
		atDate = new Date().toISOString().slice(0, 10),
		includeInactive = false,
	): Promise<V2TypicalWorkParameterListResponseDto> {
		const params = await this.paramRepository.find({
			relations: { values: true },
			order: { code: "ASC", values: { sortOrder: "ASC" } },
		});
		return {
			items: params.map((param) => {
				const allValues = param.values ?? [];
				const activeValues = includeInactive
					? allValues
					: filterTypicalWorkParameterValuesActiveOnDate(allValues, atDate);
				return {
					id: param.id,
					code: param.code,
					name: param.name,
					description: param.description,
					numeric: computeNumeric(allValues),
					values: activeValues.map((value) => ({
						id: value.id,
						code: value.code,
						label: value.label,
						coefficient:
							value.coefficient == null ? null : Number(value.coefficient),
						sortOrder: value.sortOrder,
						validFrom: value.validFrom,
						validTo: value.validTo,
					})),
				};
			}),
		};
	}

	async createParameter(
		dto: CreateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		const name = dto.name.trim();
		if (!name) throw new ConflictException("Название параметра обязательно");
		const code = normalizeCatalogCode(dto.code ?? "", name);
		const exists = await this.paramRepository.findOne({ where: { code } });
		if (exists) throw new ConflictException(`Параметр с кодом ${code} уже есть`);

		const param = await this.paramRepository.save(
			this.paramRepository.create({
				code,
				name,
				description: dto.description?.trim() || null,
			}),
		);

		return toParamDto({ ...param, values: [] });
	}

	async updateParameter(
		code: string,
		dto: UpdateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		const param = await this.findParamByCode(code);
		if (dto.code !== undefined) {
			const nextCode = normalizeCatalogCode(dto.code, param.name);
			if (nextCode !== param.code) {
				const exists = await this.paramRepository.findOne({
					where: { code: nextCode },
				});
				if (exists) {
					throw new ConflictException(`Параметр с кодом ${nextCode} уже есть`);
				}
				param.code = nextCode;
			}
		}
		if (dto.name !== undefined) {
			const name = dto.name.trim();
			if (!name) throw new ConflictException("Название параметра обязательно");
			param.name = name;
		}
		if (dto.description !== undefined) {
			param.description = dto.description?.trim() || null;
		}

		await this.paramRepository.save(param);
		const saved = await this.findParamByCode(param.code);
		return toParamDto(saved);
	}

	async deleteParameter(code: string): Promise<void> {
		const param = await this.findParamByCode(code);
		await this.paramRepository.delete(param.id);
	}

	async createParameterValue(
		paramCode: string,
		dto: CreateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		const param = await this.findParamByCode(paramCode);
		const label = dto.label.trim();
		if (!label) throw new ConflictException("Название значения обязательно");
		const code = normalizeCatalogCode(dto.code ?? "", label);
		const exists = await this.valueRepository.findOne({
			where: { paramId: param.id, code },
		});
		if (exists) throw new ConflictException(`Значение с кодом ${code} уже есть`);

		const validFrom = normalizeIsoDate(dto.validFrom, "Дата начала");
		const validTo = dto.validTo
			? normalizeIsoDate(dto.validTo, "Дата окончания")
			: null;
		if (validTo && validTo < validFrom) {
			throw new ConflictException("Дата окончания должна быть позже даты начала");
		}

		const value = await this.valueRepository.save(
			this.valueRepository.create({
				paramId: param.id,
				code,
				label,
				coefficient: normalizeCoefficient(dto.coefficient),
				sortOrder: dto.sortOrder ?? (param.values?.length ?? 0),
				validFrom,
				validTo,
			}),
		);
		return toValueDto(value);
	}

	async updateParameterValue(
		paramCode: string,
		valueCode: string,
		dto: UpdateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		const param = await this.findParamByCode(paramCode);
		const value = await this.findValueByCode(param.id, valueCode);
		if (dto.code !== undefined) {
			const nextCode = normalizeCatalogCode(dto.code, value.label);
			if (nextCode !== value.code) {
				const exists = await this.valueRepository.findOne({
					where: { paramId: param.id, code: nextCode },
				});
				if (exists) {
					throw new ConflictException(`Значение с кодом ${nextCode} уже есть`);
				}
				value.code = nextCode;
			}
		}
		if (dto.label !== undefined) {
			const label = dto.label.trim();
			if (!label) throw new ConflictException("Название значения обязательно");
			value.label = label;
		}
		if (dto.coefficient !== undefined) {
			value.coefficient = normalizeCoefficient(dto.coefficient);
		}
		if (dto.sortOrder !== undefined && dto.sortOrder !== null) {
			value.sortOrder = dto.sortOrder;
		}
		if (dto.validFrom !== undefined) {
			value.validFrom = normalizeIsoDate(dto.validFrom, "Дата начала");
		}
		if (dto.validTo !== undefined) {
			value.validTo = dto.validTo
				? normalizeIsoDate(dto.validTo, "Дата окончания")
				: null;
		}
		if (value.validTo && value.validTo < value.validFrom) {
			throw new ConflictException("Дата окончания должна быть позже даты начала");
		}

		return toValueDto(await this.valueRepository.save(value));
	}

	async deleteParameterValue(
		paramCode: string,
		valueCode: string,
	): Promise<void> {
		const param = await this.findParamByCode(paramCode);
		const value = await this.findValueByCode(param.id, valueCode);
		await this.valueRepository.delete(value.id);
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

	private async findParamByCode(code: string): Promise<V2TypicalWorkParamEntity> {
		const param = await this.paramRepository.findOne({
			where: { code },
			relations: { values: true },
			order: { values: { sortOrder: "ASC" } },
		});
		if (!param) throw new NotFoundException(`Параметр ${code} не найден`);
		return param;
	}

	private async findValueByCode(
		paramId: string,
		code: string,
	): Promise<V2TypicalWorkParamValueEntity> {
		const value = await this.valueRepository.findOne({ where: { paramId, code } });
		if (!value) throw new NotFoundException(`Значение ${code} не найдено`);
		return value;
	}
}
