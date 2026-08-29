export interface PageScrollMetrics {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}

export const getPagedScrollTarget = (metrics: PageScrollMetrics, direction: 1 | -1) => {
  const pageHeight = Math.max(1, metrics.clientHeight);
  const maxScrollTop = Math.max(0, metrics.scrollHeight - pageHeight);
  const currentTop = Math.max(0, metrics.scrollTop);

  if (direction > 0) {
    const currentPage = Math.floor((currentTop + pageHeight * 0.12) / pageHeight);
    return Math.min(maxScrollTop, (currentPage + 1) * pageHeight);
  }

  const currentPage = Math.ceil(Math.max(0, currentTop - pageHeight * 0.12) / pageHeight);
  return Math.max(0, (currentPage - 1) * pageHeight);
};
