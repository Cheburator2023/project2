import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity()
export class QuestionnaireItemEntity {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID' })
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    @ApiProperty({ example: 'Количество моделей', description: 'Название поля' })
    name: string;

    @Column({ type: 'varchar', length: 50, nullable: false })
    @ApiProperty({ example: 'modelsCount', description: 'Код поля (машинное имя)' })
    code: string;

    @Column({ type: 'text', nullable: true })
    @ApiProperty({ example: 'Количество моделей (>1 для каскадов)', description: 'Описание поля', required: false })
    description?: string;

    @Column({ type: 'boolean', nullable: false, default: true })
    @ApiProperty({ example: true, description: 'Обязательность поля' })
    isRequired: boolean;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @Column({ type: 'varchar', length: 50, nullable: false })
    @ApiProperty({
        example: 'number',
        description: 'Тип поля',
        enum: ['number', 'text', 'select', 'multiselect', 'boolean']
    })
    fieldType: string;

    @Column({ type: 'jsonb', nullable: true })
    @ApiProperty({
        example: ['1', '2', '3'],
        description: 'Доступные опции для select/multiselect',
        required: false
    })
    options?: string[];

    @Column({ type: 'integer', nullable: true })
    @ApiProperty({ example: 1, description: 'Порядок отображения', required: false })
    order?: number;
}