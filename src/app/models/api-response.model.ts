export interface ApiMetadata {
  page: number | null;
  pageSize: number | null;
  totalCount: number | null;
  totalPages: number | null;
  hasNextPage: boolean | null;
  hasPreviousPage: boolean | null;
  additional: any | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors: string[];
  metadata: ApiMetadata;
  timestamp: string;
  traceId: string;
}

export class ApiResponseHandler {
  static isSuccess<T>(response: ApiResponse<T>): boolean {
    return response.success && (response.statusCode === 200 || response.statusCode === 201);
  }

  static hasErrors<T>(response: ApiResponse<T>): boolean {
    return response.errors && response.errors.length > 0;
  }

  static getErrorMessage<T>(response: ApiResponse<T>): string {
    if (this.hasErrors(response)) {
      return response.errors.join(', ');
    }
    return response.message || 'Unknown error occurred';
  }

  static extractData<T>(response: ApiResponse<T>): T | null {
    return this.isSuccess(response) ? response.data : null;
  }
}