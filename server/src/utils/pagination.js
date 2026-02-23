const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const parsePagination = (query, defaults = {}) => {
  const defaultPageSize = defaults.defaultPageSize ?? 20;
  const maxPageSize = defaults.maxPageSize ?? 100;

  const page = Math.max(toNumber(query.page, 1), 1);
  const requestedPageSize = Math.max(toNumber(query.pageSize, defaultPageSize), 1);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
};

export const buildPageMeta = ({ page, pageSize, total }) => {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};
