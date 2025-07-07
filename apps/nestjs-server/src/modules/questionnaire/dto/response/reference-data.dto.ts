import { ApiProperty } from "@nestjs/swagger";

export class ReferenceDataDto {
    @ApiProperty({
        type: 'array',
        items: { type: 'string' },
        description: 'Стрим-исполнитель',
        example: ['Stream A', 'Stream B']
    })
    streamExecutor: string[];

    @ApiProperty({
        type: 'array',
        items: { type: 'string' },
        description: 'Департамент заказчика',
        example: ['Department 1', 'Department 2']
    })
    department: string[];
}