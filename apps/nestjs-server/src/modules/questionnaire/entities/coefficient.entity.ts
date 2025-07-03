import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity('coefficient')
export class CoefficientEntity {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID' })
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    @ApiProperty({ example: 'Коэффициент количества моделей', description: 'Название коэффициента' })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    @ApiProperty({ example: 'modelsCount', description: 'Код коэффициента' })
    code: string;

    @Column({ type: 'float', nullable: false })
    @ApiProperty({ example: 1.0, description: 'Базовое значение коэффициента' })
    baseValue: number;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    @ApiProperty({
        example: { "default": 1, "formula": "1 + (value - 1) * 0.75" },
        description: 'Условия расчета',
        required: false
    })
    conditions?: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    @ApiProperty({
        example: 'Коэффициент для учета количества моделей',
        description: 'Описание коэффициента',
        required: false
    })
    description?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}