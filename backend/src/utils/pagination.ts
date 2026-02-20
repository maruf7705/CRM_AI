export interface OffsetPaginationQuery {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  skip: number;
}

export interface CursorPaginationQuery {
  cursor?: string | undefined;
  limit?: number | undefined;
}

export const toOffsetPagination = (
  query: OffsetPaginationQuery,
  defaults: { page: number; limit: number } = { page: 1, limit: 20 },
): OffsetPaginationMeta => {
  const page = Math.max(1, query.page ?? defaults.page);
  const limit = Math.min(100, Math.max(1, query.limit ?? defaults.limit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const toCursorLimit = (query: CursorPaginationQuery, defaultLimit = 50): number => {
  return Math.min(100, Math.max(1, query.limit ?? defaultLimit));
};
