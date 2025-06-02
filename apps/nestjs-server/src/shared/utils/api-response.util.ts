export class ApiResponse<T> {
	constructor(
		public readonly success: boolean,
		public readonly data: T | null,
		public readonly message?: string,
		public readonly errorCode?: string,
	) {}

	static success<T>(data: T, message?: string): ApiResponse<T> {
		return new ApiResponse(true, data, message);
	}

	static error<T>(
		message: string,
		errorCode?: string,
		data: T | null = null,
	): ApiResponse<T> {
		return new ApiResponse(false, data, message, errorCode);
	}

	static paginated<T>(
		data: T[],
		total: number,
		page: number,
		limit: number,
		message?: string,
	): ApiResponse<{
		data: T[];
		meta: { total: number; page: number; limit: number };
	}> {
		return new ApiResponse(
			true,
			{
				data,
				meta: { total, page, limit },
			},
			message,
		);
	}
}
