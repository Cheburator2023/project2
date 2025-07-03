import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CoefficientEntity } from "../entities/coefficient.entity";
import { QuestionnaireItemEntity } from "../entities/questionnaire-item.entity";
import { StreamAverageEntity } from "../entities/stream-average.entity";
import { DictionaryItemDto, QuestionnaireResponseDto, StreamAverageDto } from "../dto/response/questionnaire-response.dto";

@Injectable()
export class QuestionnaireService {
    constructor(
        @InjectRepository(QuestionnaireItemEntity)
        private readonly questionnaireItemRepo: Repository<QuestionnaireItemEntity>,
        @InjectRepository(CoefficientEntity)
        private readonly coefficientRepo: Repository<CoefficientEntity>,
        @InjectRepository(StreamAverageEntity)
        private readonly streamAverageRepo: Repository<StreamAverageEntity>,
    ) {}

    private async getRiskItems(): Promise<DictionaryItemDto[]> {
        const riskItem = await this.questionnaireItemRepo.findOne({
            where: { code: 'generalUncertainty', isActive: true }
        });

        if (!riskItem || !riskItem.options) return [];

        try {
            const options = JSON.parse(JSON.stringify(riskItem.options));
            const riskCoefficients = await this.coefficientRepo.find({
                where: { code: 'risk_%' }
            });

            return options.map((option: any) => {
                const coeff = riskCoefficients.find(c => c.code === `risk_${option.value}`);
                return {
                    value: option.value,
                    label: option.label,
                    hint: option.hint,
                    coefficient: coeff?.baseValue || 0
                };
            });
        } catch (e) {
            return [];
        }
    }

    async getFullQuestionnaire(): Promise<QuestionnaireResponseDto> {
        const [items, coefficients, streamAverages] = await Promise.all([
            this.questionnaireItemRepo.find({
                where: { isActive: true },
                order: { order: 'ASC' }
            }),
            this.coefficientRepo.find({
                where: { isActive: true }
            }),
            this.streamAverageRepo.find()
        ]);

        const dictionaries: Record<string, DictionaryItemDto[]> = {};

        for (const item of items) {
            if (item.fieldType === 'risk') {
                dictionaries[item.code] = await this.getRiskItems();
                continue;
            }

            if (item.fieldType === 'select' || item.fieldType === 'multiselect') {
                try {
                    const options = JSON.parse(JSON.stringify(item.options || []));

                    dictionaries[item.code] = options.map((option: any) => {
                        const value = option.value || option;
                        const label = option.label || option.value || option;
                        const hint = option.hint || '';

                        const coeff = coefficients.find(c =>
                            c.code.startsWith(`${item.code}_${value}`) ||
                            (label && c.code.startsWith(`${item.code}_${label}`))
                        );

                        return {
                            value,
                            label: typeof option === 'object' ? option.label : undefined,
                            coefficient: coeff?.baseValue,
                            hint: hint || coeff?.description
                        };
                    });
                } catch (e) {
                    dictionaries[item.code] = [];
                }
            } else {
                dictionaries[item.code] = [{
                    value: null,
                    hint: item.description || ''
                }];
            }
        }

        const streamAveragesDto = new StreamAverageDto();
        for (const avg of streamAverages) {
            streamAveragesDto[avg.epicName as keyof StreamAverageDto] = avg.averageValue;
        }

        return {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            author: "system",
            dictionaries,
            streamAverages: streamAveragesDto
        };
    }

    async getQuestionnaireItemByCode(code: string): Promise<QuestionnaireItemEntity | null> {
        return this.questionnaireItemRepo.findOne({
            where: { code, isActive: true },
            relations: ['coefficients']
        });
    }

    async getAllActiveItems(): Promise<QuestionnaireItemEntity[]> {
        return this.questionnaireItemRepo.find({
            where: { isActive: true },
            order: { order: 'ASC' },
            relations: ['coefficients']
        });
    }

    async getCoefficientsForItem(itemCode: string): Promise<CoefficientEntity[]> {
        return this.coefficientRepo.find({
            where: {
                code: `${itemCode}_%`,
                isActive: true
            }
        });
    }

    async getStreamAverages(): Promise<StreamAverageDto> {
        const averages = await this.streamAverageRepo.find();
        const dto = new StreamAverageDto();

        averages.forEach(avg => {
            dto[avg.epicName as keyof StreamAverageDto] = avg.averageValue;
        });

        return dto;
    }
}