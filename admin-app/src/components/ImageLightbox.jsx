import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;

/**
 * 이미지 확대 팝업
 * - 휠 확대/축소, 드래그 이동, 더블클릭 토글
 * - 하단 썸네일로 사진 전환
 */
export default function ImageLightbox({ items, index, onClose, onIndexChange }) {
  const total = items?.length || 0;
  const safeIndex = total ? Math.min(Math.max(0, index), total - 1) : 0;
  const current = total ? items[safeIndex] : null;
  const canNav = total > 1 && typeof onIndexChange === 'function';

  const viewportRef = useRef(null);
  const thumbsRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const viewRef = useRef({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    viewRef.current = { scale, x: pos.x, y: pos.y };
  }, [scale, pos]);

  const resetView = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  // 사진 바꿀 때 뷰 초기화 + 활성 썸네일 중앙 스크롤
  useEffect(() => {
    resetView();
    const root = thumbsRef.current;
    if (!root) return;
    const active = root.querySelector('.img-lightbox__thumb.is-active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeIndex, current?.src, resetView]);

  const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomAt = useCallback((nextScale, clientX, clientY) => {
    const vp = viewportRef.current;
    const prev = viewRef.current.scale;
    const next = clampScale(nextScale);
    if (next === prev) return;

    let cx = 0;
    let cy = 0;
    if (vp && clientX != null && clientY != null) {
      const rect = vp.getBoundingClientRect();
      cx = clientX - rect.left - rect.width / 2;
      cy = clientY - rect.top - rect.height / 2;
    }

    const { x: tx, y: ty } = viewRef.current;
    let nx = cx - ((cx - tx) * next) / prev;
    let ny = cy - ((cy - ty) * next) / prev;
    let ns = next;
    if (ns <= 1.02) {
      ns = 1;
      nx = 0;
      ny = 0;
    }
    setScale(ns);
    setPos({ x: nx, y: ny });
  }, []);

  const go = useCallback(
    (delta) => {
      if (!canNav || !total) return;
      const next = (safeIndex + delta + total) % total;
      onIndexChange(next);
    },
    [canNav, total, safeIndex, onIndexChange]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomAt(viewRef.current.scale * 1.2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomAt(viewRef.current.scale / 1.2);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, go, zoomAt, resetView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(viewRef.current.scale * factor, e.clientX, e.clientY);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, current?.src]);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('.img-lightbox__nav')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }

  function onPointerUp(e) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onDoubleClick(e) {
    e.preventDefault();
    if (viewRef.current.scale > 1.1) resetView();
    else zoomAt(2.5, e.clientX, e.clientY);
  }

  if (!current?.src) return null;

  return (
    <div
      className="img-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대 보기"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="img-lightbox__panel" onClick={(e) => e.stopPropagation()}>
        <div className="img-lightbox__bar">
          <p className="img-lightbox__title" title={current.name || ''}>
            {current.name || '이미지'}
            {total > 1 ? (
              <span className="img-lightbox__count">
                {' '}
                · {safeIndex + 1} / {total}
              </span>
            ) : null}
          </p>
          <div className="img-lightbox__tools">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-label="축소"
              onClick={() => zoomAt(scale / 1.25)}
            >
              −
            </button>
            <span className="img-lightbox__zoom-label">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-label="확대"
              onClick={() => zoomAt(scale * 1.25)}
            >
              +
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetView}>
              맞춤
            </button>
            <button type="button" className="btn btn--ghost btn--sm img-lightbox__close" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
        <div className="img-lightbox__stage">
          {canNav ? (
            <button
              type="button"
              className="img-lightbox__nav img-lightbox__nav--prev"
              aria-label="이전 사진"
              onClick={() => go(-1)}
            >
              ‹
            </button>
          ) : null}
          <div
            ref={viewportRef}
            className={`img-lightbox__viewport${scale > 1.02 ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
            onDragStart={(e) => e.preventDefault()}
          >
            <img
              className="img-lightbox__img"
              src={current.src}
              alt={current.name || '확대 이미지'}
              draggable={false}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              }}
            />
          </div>
          {canNav ? (
            <button
              type="button"
              className="img-lightbox__nav img-lightbox__nav--next"
              aria-label="다음 사진"
              onClick={() => go(1)}
            >
              ›
            </button>
          ) : null}
        </div>
        {total > 0 ? (
          <div ref={thumbsRef} className="img-lightbox__thumbs" role="list" aria-label="사진 목록">
            {items.map((item, i) => (
              <button
                key={`${item.src}-${i}`}
                type="button"
                role="listitem"
                className={`img-lightbox__thumb${i === safeIndex ? ' is-active' : ''}`}
                aria-label={`${item.name || '사진'} ${i + 1}`}
                aria-current={i === safeIndex ? 'true' : undefined}
                onClick={() => {
                  if (typeof onIndexChange === 'function') onIndexChange(i);
                  else if (i !== safeIndex) {
                    /* single-item 또는 비제어: 무시 */
                  }
                }}
              >
                <img src={item.src} alt="" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
        <p className="img-lightbox__hint">
          휠로 확대·축소 · 드래그로 이동 · 더블클릭 확대/맞춤
          {canNav ? ' · ← → 넘기기' : ''} · Esc 닫기
        </p>
      </div>
    </div>
  );
}
