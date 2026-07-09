import { useMemo, useState } from 'react';
import { useFetchList } from '../hooks/useFetchList.js';
import { categoryCounts, uniqueField } from '../lib/format.js';
import FilterChips from '../components/FilterChips.jsx';
import LoadMore from '../components/LoadMore.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import ProductCard from '../components/ProductCard.jsx';

const PAGE = 12;

export default function ShowcaseApp() {
  const { all, status, errorMsg } = useFetchList(
    '/api/products',
    '제품을 불러오지 못했습니다. 서버(npm start)가 실행 중인지 확인해 주세요.'
  );
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [material, setMaterial] = useState('');
  const [process, setProcess] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const chips = useMemo(() => categoryCounts(all, 'category', '미분류'), [all]);
  const industries = useMemo(() => uniqueField(all, 'industry'), [all]);
  const materials = useMemo(() => uniqueField(all, 'material'), [all]);
  const processes = useMemo(() => uniqueField(all, 'process'), [all]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return all.filter((p) => {
      const text = [p.title, p.summary, p.category, p.industry, p.material, p.process]
        .join(' ')
        .toLowerCase();
      return (
        (filter === '전체' || (p.category || '미분류') === filter) &&
        (!industry || (p.industry || '') === industry) &&
        (!material || (p.material || '') === material) &&
        (!process || (p.process || '') === process) &&
        (!q || text.includes(q))
      );
    });
  }, [all, filter, query, industry, material, process]);

  const shown = filtered.slice(0, visible);

  function resetPage(fn) {
    setVisible(PAGE);
    fn();
  }

  const early = <StatusMessage status={status} emptyText="아직 등록된 제품이 없습니다." errorMsg={errorMsg} />;
  if (status !== 'ready') return early;

  return (
    <>
      <FilterChips
        chips={chips}
        active={filter}
        onChange={(k) => resetPage(() => setFilter(k))}
      />
      <div className="res-tools">
        <p className="show-count" style={{ margin: 0, textAlign: 'left' }}>
          총 {filtered.length}개 중 {shown.length}개 표시
        </p>
        <div className="res-search show-search">
          <input
            type="search"
            placeholder="제품명·소재·공정 검색"
            value={query}
            onChange={(e) => resetPage(() => setQuery(e.target.value))}
          />
          <select
            aria-label="산업군"
            value={industry}
            onChange={(e) => resetPage(() => setIndustry(e.target.value))}
          >
            <option value="">산업군 전체</option>
            {industries.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="소재"
            value={material}
            onChange={(e) => resetPage(() => setMaterial(e.target.value))}
          >
            <option value="">소재 전체</option>
            {materials.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="공정"
            value={process}
            onChange={(e) => resetPage(() => setProcess(e.target.value))}
          >
            <option value="">공정 전체</option>
            {processes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="show-grid">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <LoadMore visible={shown.length} total={filtered.length} onMore={() => setVisible((v) => v + PAGE)} />
      {filtered.length === 0 ? <p className="empty-note">조건에 맞는 제품이 없습니다.</p> : null}
    </>
  );
}
