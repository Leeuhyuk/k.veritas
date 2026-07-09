export default function LoadMore({ visible, total, onMore, label = '더 보기' }) {
  if (visible >= total) return null;
  return (
    <div className="show-more">
      <button type="button" className="btn btn--ghost" onClick={onMore}>
        {label}
      </button>
    </div>
  );
}
