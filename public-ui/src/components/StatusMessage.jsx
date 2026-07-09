export default function StatusMessage({ status, emptyText, errorMsg }) {
  if (status === 'loading') {
    return <p className="empty-note">불러오는 중…</p>;
  }
  if (status === 'error') {
    return <p className="empty-note">{errorMsg || '불러오지 못했습니다.'}</p>;
  }
  if (status === 'empty') {
    return <p className="empty-note">{emptyText || '등록된 항목이 없습니다.'}</p>;
  }
  return null;
}
