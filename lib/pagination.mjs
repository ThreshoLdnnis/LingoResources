export function pageInfo(total, requested = 1, size = 12) {
  const pageSize = Math.max(1, Math.floor(size));
  const count = Math.max(0, Math.floor(total));
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(requested)));
  const offset = (page - 1) * pageSize;
  return { page, pages, offset, start: count ? offset + 1 : 0, end: Math.min(offset + pageSize, count), total: count, pageSize };
}

export function pageNumbers(page, pages) {
  const selected = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(n => selected.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach(n => selected.add(n));
  const numbers = [...selected].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return numbers.flatMap((n, i) => i && n - numbers[i - 1] > 1 ? ['gap-' + n, n] : [n]);
}
