/** GitHub Pages 등 API 없는 정적 호스팅 */
export function isStaticHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname || '';
  return /\.github\.io$/i.test(h) || window.FORCE_STATIC_ADMIN === true;
}

export function siteBase() {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname || '';
  if (path.indexOf('/k.veritas') === 0) return '/k.veritas';
  return '';
}
