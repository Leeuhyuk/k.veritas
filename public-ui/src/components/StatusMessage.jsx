/**
 * 로딩 / 빈 목록 / 오류 표시
 * - loading: 텍스트 대신 스켈레톤 (깜빡이는 안내 문구 제거)
 */
export default function StatusMessage({ status, emptyText, errorMsg, variant = 'cards' }) {
  if (status === 'loading') {
    if (variant === 'table') {
      return (
        <div className="list-skeleton list-skeleton--table" aria-busy="true" aria-label="불러오는 중">
          {[0, 1, 2, 3].map((i) => (
            <div className="list-skeleton__row" key={i}>
              <span className="list-skeleton__bar list-skeleton__bar--sm" />
              <span className="list-skeleton__bar list-skeleton__bar--lg" />
              <span className="list-skeleton__bar list-skeleton__bar--md" />
            </div>
          ))}
        </div>
      );
    }
    if (variant === 'list') {
      return (
        <div className="list-skeleton list-skeleton--list" aria-busy="true" aria-label="불러오는 중">
          {[0, 1, 2].map((i) => (
            <div className="list-skeleton__news" key={i}>
              <span className="list-skeleton__bar list-skeleton__bar--sm" />
              <span className="list-skeleton__bar list-skeleton__bar--lg" />
              <span className="list-skeleton__bar list-skeleton__bar--md" />
            </div>
          ))}
        </div>
      );
    }
    // cards (showcase)
    return (
      <div className="list-skeleton list-skeleton--cards show-grid" aria-busy="true" aria-label="불러오는 중">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="list-skeleton__card" key={i}>
            <div className="list-skeleton__media" />
            <div className="list-skeleton__body">
              <span className="list-skeleton__bar list-skeleton__bar--sm" />
              <span className="list-skeleton__bar list-skeleton__bar--lg" />
              <span className="list-skeleton__bar list-skeleton__bar--md" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (status === 'error') {
    return <p className="empty-note">{errorMsg || '불러오지 못했습니다.'}</p>;
  }
  if (status === 'empty') {
    return <p className="empty-note">{emptyText || '등록된 항목이 없습니다.'}</p>;
  }
  return null;
}
