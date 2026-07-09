export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(html, n = 90) {
  return stripHtml(html).slice(0, n);
}

export function uniqueField(list, field) {
  return Array.from(new Set(list.map((p) => (p[field] || '').trim()).filter(Boolean))).sort();
}

export function categoryCounts(list, field = 'category', fallback = '기타') {
  const counts = {};
  list.forEach((item) => {
    const c = item[field] || fallback;
    counts[c] = (counts[c] || 0) + 1;
  });
  return ['전체'].concat(Object.keys(counts).sort()).map((c) => ({
    key: c,
    count: c === '전체' ? list.length : counts[c],
  }));
}
