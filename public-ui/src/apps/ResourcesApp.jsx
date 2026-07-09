import { useMemo, useState } from 'react';
import { useFetchList } from '../hooks/useFetchList.js';
import { categoryCounts } from '../lib/format.js';
import FilterChips from '../components/FilterChips.jsx';
import LoadMore from '../components/LoadMore.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import ResourceRow from '../components/ResourceRow.jsx';

const PAGE = 15;

export default function ResourcesApp() {
  const { all, status, errorMsg } = useFetchList(
    '/api/resources',
    '자료를 불러오지 못했습니다. 서버(npm start)가 실행 중인지 확인해 주세요.'
  );
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const chips = useMemo(() => categoryCounts(all, 'category', '기타'), [all]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return all.filter(
      (r) =>
        (filter === '전체' || (r.category || '기타') === filter) &&
        (!q || (r.title || '').toLowerCase().includes(q))
    );
  }, [all, filter, query]);

  const shown = filtered.slice(0, visible);

  function resetPage(fn) {
    setVisible(PAGE);
    fn();
  }

  if (status !== 'ready') {
    return (
      <StatusMessage status={status} emptyText="등록된 자료가 없습니다." errorMsg={errorMsg} />
    );
  }

  return (
    <>
      <FilterChips
        chips={chips}
        active={filter}
        onChange={(k) => resetPage(() => setFilter(k))}
      />
      <div className="res-tools">
        <p className="show-count" style={{ margin: 0, textAlign: 'left' }}>
          총 {filtered.length}건
        </p>
        <div className="res-search">
          <label className="res-search__field">
            <input
              type="search"
              placeholder="제목 검색"
              value={query}
              onChange={(e) => resetPage(() => setQuery(e.target.value))}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </label>
        </div>
      </div>

      <div className="res-table-wrap">
        <table className="res-table">
          <thead>
            <tr>
              <th className="res-col-cat">분류</th>
              <th>제목</th>
              <th className="res-col-file">첨부파일</th>
              <th className="res-col-date">등록일</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <ResourceRow key={r.id} item={r} />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? <p className="empty-note">조건에 맞는 자료가 없습니다.</p> : null}
      <LoadMore visible={shown.length} total={filtered.length} onMore={() => setVisible((v) => v + PAGE)} />
    </>
  );
}
