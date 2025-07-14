# Calculation Module - Refactored Architecture

## Overview

This module has been refactored following NestJS best practices to improve maintainability, type safety, and separation of concerns.

## Architecture Improvements

### 1. DTO Structure

#### Before (Problems):
- Single large DTO file (396 lines)
- Duplicated enum values
- No separation between request and response DTOs
- Direct entity exposure in API responses

#### After (Solutions):
```
dto/
├── base/
│   └── calculation-base.dto.ts          # Base DTO with common fields and enums
├── common/
│   ├── probability-influence.dto.ts     # Reusable probability-influence pairs
│   ├── algorithm-type.dto.ts           # Algorithm type definitions
│   └── uncertainty-item.dto.ts         # Uncertainty item definitions
├── request/
│   └── create-calculation.dto.ts       # Request DTO extending base
├── response/
│   ├── calculation-response.dto.ts     # Response DTO for single calculation
│   └── paginated-calculation-response.dto.ts # Response DTO for paginated results
├── pagination.dto.ts                   # Pagination parameters
└── index.ts                           # Centralized exports
```

### 2. Key Improvements

#### Enum Centralization
```typescript
// All enum values centralized in base DTO
export const INITIATIVE_TIMELINE_VALUES = [
  "Менее 1 мес.",
  "1-4 мес.",
  // ...
] as const;

// Type-safe usage
initiativeTimeline: typeof INITIATIVE_TIMELINE_VALUES[number];
```

#### Validation Enhancement
```typescript
// Added IsIn decorator for enum validation
@IsIn(INITIATIVE_TIMELINE_VALUES, { 
  message: "initiativeTimeline must be one of the allowed values" 
})
initiativeTimeline: typeof INITIATIVE_TIMELINE_VALUES[number];
```

#### Response DTOs
```typescript
// Separate response DTOs instead of exposing entities
export class CalculationResponseDto {
  @ApiProperty()
  id: string;
  
  @ApiProperty()
  name: string;
  
  @ApiProperty({ type: CalculationQuestionnaireDataDto })
  questionnaireData: CalculationQuestionnaireDataDto;
  
  // ...
}
```

### 3. Controller Improvements

#### Before:
- Direct entity returns
- Incomplete Swagger documentation
- No proper error handling

#### After:
```typescript
@Post()
@ApiOperation({ 
  summary: "Create new calculation",
  description: "Creates a new calculation with the provided data"
})
@ApiResponse({
  status: HttpStatus.CREATED,
  description: "The calculation has been successfully created.",
  type: CalculationResponseDto,
})
async create(@Body() createCalculationDto: CreateCalculationDto): Promise<CalculationResponseDto> {
  const calculation = await this.calculationService.create(createCalculationDto);
  return this.mapToResponseDto(calculation);
}
```

### 4. Service Improvements

#### Error Handling
```typescript
async findOne(id: string): Promise<Calculation> {
  const calculation = await this.calculationRepository.findOne({
    where: { id },
  });

  if (!calculation) {
    throw new NotFoundException(`Calculation with ID ${id} not found`);
  }

  return calculation;
}
```

#### Try-Catch Blocks
```typescript
async create(createCalculationDto: CreateCalculationDto): Promise<Calculation> {
  try {
    // ... creation logic
    return await this.calculationRepository.save(calculation);
  } catch (error) {
    throw new BadRequestException(`Failed to create calculation: ${error.message}`);
  }
}
```

## Client-Side Improvements

### 1. Type Safety

#### Centralized Types
```typescript
// calculation.types.ts
export const INITIATIVE_TIMELINE_VALUES = [
  "Менее 1 мес.",
  "1-4 мес.",
  // ...
] as const;

export type InitiativeTimeline = typeof INITIATIVE_TIMELINE_VALUES[number];
```

#### API Service
```typescript
export class CalculationApiService {
  async createCalculation(data: CreateCalculationRequest): Promise<CalculationResponse> {
    return this.protectedFetch("/calculation", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### React Query Hooks
```typescript
export const calculationKeys = {
  all: ["calculations"] as const,
  lists: () => [...calculationKeys.all, "list"] as const,
  list: (filters: PaginationParams) => [...calculationKeys.lists(), filters] as const,
  details: () => [...calculationKeys.all, "detail"] as const,
  detail: (id: string) => [...calculationKeys.details(), id] as const,
};

export const useCalculationsPaginated = (params: PaginationParams = {}) => {
  const apiService = useCalculationApiService();
  
  return useQuery({
    queryKey: calculationKeys.list(params),
    queryFn: () => apiService.getCalculationsPaginated(params),
    staleTime: 30_000,
  });
};
```

## Best Practices Implemented

### 1. Separation of Concerns
- **DTOs**: Separate request/response DTOs
- **Services**: Business logic with proper error handling
- **Controllers**: HTTP layer with validation and documentation
- **Entities**: Database models with proper typing

### 2. Type Safety
- **Enum values**: Centralized and type-safe
- **Validation**: Comprehensive validation with custom messages
- **Response types**: Properly typed API responses

### 3. Error Handling
- **Custom exceptions**: Proper HTTP status codes
- **Try-catch blocks**: Graceful error handling
- **Validation errors**: Clear error messages

### 4. Documentation
- **Swagger**: Complete API documentation
- **JSDoc**: Method documentation
- **README**: Architecture documentation

### 5. Code Organization
- **Modular structure**: Logical file organization
- **Index files**: Centralized exports
- **Naming conventions**: Consistent naming patterns

## Migration Guide

### For Backend Developers:
1. Update imports to use new DTO structure
2. Use new Response DTOs in controllers
3. Implement proper error handling
4. Update tests to use new DTOs

### For Frontend Developers:
1. Use new typed API service
2. Update React Query hooks
3. Use centralized type definitions
4. Implement proper error handling

## Benefits

1. **Maintainability**: Easier to maintain and extend
2. **Type Safety**: Compile-time type checking
3. **Documentation**: Better API documentation
4. **Error Handling**: Consistent error responses
5. **Testing**: Easier to test with proper separation
6. **Performance**: Better caching with React Query
7. **Developer Experience**: Better IDE support and autocomplete 