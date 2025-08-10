/**
 * Pagination Utilities
 * 
 * This module provides utilities for paginating database queries.
 * It helps with implementing consistent pagination across the platform.
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Default pagination parameters
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters
 * @param params The pagination parameters
 * @returns The parsed pagination parameters
 */
export function parsePaginationParams(params: PaginationParams = {}): {
  skip: number;
  take: number;
  cursor?: { id: string };
  orderBy?: { [key: string]: 'asc' | 'desc' };
} {
  const page = Math.max(params.page || DEFAULT_PAGE, 1);
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;
  
  // Build the result
  const result: any = {
    skip,
    take: limit,
  };
  
  // Add cursor if provided
  if (params.cursor) {
    result.cursor = { id: params.cursor };
  }
  
  // Add orderBy if provided
  if (params.orderBy) {
    result.orderBy = {
      [params.orderBy]: params.orderDirection || 'desc',
    };
  } else {
    // Default order by createdAt
    result.orderBy = {
      createdAt: 'desc',
    };
  }
  
  return result;
}

/**
 * Create a paginated result
 * @param data The data to paginate
 * @param total The total number of items
 * @param params The pagination parameters
 * @returns The paginated result
 */
export function createPaginatedResult<T extends { id: string }>(
  data: T[],
  total: number,
  params: PaginationParams = {}
): PaginatedResult<T> {
  const page = Math.max(params.page || DEFAULT_PAGE, 1);
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const hasMore = page * limit < total;
  
  // Get the last item's ID as the next cursor
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;
  
  return {
    data,
    metadata: {
      total,
      page,
      limit,
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Apply pagination to a Prisma query
 * @param query The Prisma query
 * @param params The pagination parameters
 * @returns The paginated query
 */
export function applyPagination(query: any, params: PaginationParams = {}): any {
  const { skip, take, cursor, orderBy } = parsePaginationParams(params);
  
  // Apply pagination to the query
  query = query.skip(skip).take(take);
  
  // Apply cursor if provided
  if (cursor) {
    query = query.cursor(cursor);
  }
  
  // Apply orderBy if provided
  if (orderBy) {
    query = query.orderBy(orderBy);
  }
  
  return query;
}
