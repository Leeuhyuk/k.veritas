import { useState } from 'react';

const PAGE_SIZE = 10;

function text(s) {
  return String(s || '').trim();
}

export default function ProductList({ items, onEdit, onDelete, onReorder }) {
  const [page, setPage] = useState(1);
  const [dragId, setDragId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);

  function move(id, dir) {
    const i = items.findIndex((p) => p.id === id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next.map((p) => p.id));
  }

  function onDragStart(e, id) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(e, overId) {
    e.preventDefault();
    if (!dragId || dragId === overId) {
      setDragId(null);
      return;
    }
    const from = items.findIndex((p) => p.id === dragId);
    const to = items.findIndex((p) => p.id === overId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = items.slice();
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setDragId(null);
    onReorder(next.map((p) => p.id));
  }

  if (!items.length) {
    return (
      <div className="admin__list">
        <div className="admin-list__head">
          <p className="microlabel">등록된 제품</p>
        </div>
        <p className="empty-note" style={{ padding: 'var(--spacing-32) 0' }}>
          아직 등록된 제품이 없습니다.
        </p>
      </div>
    );
  }

  const end = Math.min(safePage * PAGE_SIZE, items.length);

  return (
    <div className="admin__list admin-list--products">
      <div className="admin-list__head">
        <p className="microlabel">등록된 제품</p>
        <span className="admin-list__count">
          총 <strong>{items.length}</strong>개 · {start + 1}–{end} 표시
        </span>
      </div>

      <div className="admin-list__rows">
        {slice.map((p, idx) => {
          const published = p.status !== 'draft';
          const category = text(p.category) || '미분류';
          const summary = text(p.summary);
          const imgCount = p.images ? p.images.length : 0;
          const thumb =
            p.images && p.images[0] ? (
              <img className="admin-list__thumb" src={p.images[0]} alt="" />
            ) : (
              <div className="admin-list__thumb ph" aria-hidden="true">
                <span>NO IMG</span>
              </div>
            );

          return (
            <div
              key={p.id}
              className={`admin__row admin-list__row${dragId === p.id ? ' dragging' : ''}`}
              draggable
              onDragStart={(e) => onDragStart(e, p.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, p.id)}
              onDragEnd={() => setDragId(null)}
            >
              <span className="drag-handle" title="드래그하여 순서 변경" aria-hidden="true">
                ⠿
              </span>
              <span className="admin-list__index" title="목록 순번">
                {start + idx + 1}
              </span>
              {thumb}

              <div className="admin__row-main admin-list__main">
                <div className="admin-list__title-row">
                  <h3 className="admin-list__title">{text(p.title) || '(제목 없음)'}</h3>
                  <span className={`admin-list__status${published ? ' is-on' : ' is-off'}`}>
                    {published ? '게시' : '비공개'}
                  </span>
                </div>

                {summary ? <p className="admin-list__summary">{summary}</p> : null}

                <div className="admin-list__meta">
                  <span className="admin-list__chip admin-list__chip--cat" title="분야">
                    {category}
                  </span>
                  <span className="admin-list__chip admin-list__chip--muted" title="이미지 수">
                    이미지 {imgCount}장
                  </span>
                </div>
              </div>

              <div className="admin-list__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  title="위로"
                  onClick={() => move(p.id, 'up')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  title="아래로"
                  onClick={() => move(p.id, 'down')}
                >
                  ▼
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(p.id)}>
                  수정
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(p.id)}>
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="admin-pager">
          <span className="admin-pager__info">
            {safePage} / {totalPages} 페이지
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`btn btn--ghost btn--sm${n === safePage ? ' is-active' : ''}`}
              aria-current={n === safePage ? 'page' : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  );
}
