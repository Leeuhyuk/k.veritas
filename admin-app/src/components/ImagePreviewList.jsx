import { useState } from 'react';
import ImageLightbox from './ImageLightbox.jsx';

/**
 * URL 기반 이미지 썸네일 목록 + 클릭 확대
 * @param {string[]} urls
 * @param {(index: number) => void} [onRemove]
 * @param {string} [labelPrefix]
 * @param {string} [ariaLabel]
 */
export default function ImagePreviewList({
  urls = [],
  onRemove,
  labelPrefix = '사진',
  ariaLabel = '사진 미리보기',
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!urls.length) return null;

  const items = urls.map((src, i) => ({
    src,
    name: `${labelPrefix} ${i + 1}`,
  }));

  return (
    <>
      <ul className="file-drop__previews" aria-label={ariaLabel}>
        {urls.map((u, i) => (
          <li className="file-preview is-image" key={`${u}-${i}`}>
            <button
              type="button"
              className="file-preview__open"
              onClick={() => setLightboxIndex(i)}
              aria-label={`${labelPrefix} ${i + 1} 크게 보기`}
            >
              <img className="file-preview__thumb" src={u} alt="" />
              <span className="file-preview__zoom" aria-hidden="true">
                확대
              </span>
            </button>
            <div className="file-preview__meta">
              <span className="file-preview__name">
                {labelPrefix} {i + 1}
              </span>
              <span className="file-preview__size">클릭하면 확대</span>
            </div>
            {typeof onRemove === 'function' ? (
              <button
                type="button"
                className="file-preview__remove"
                aria-label={`${labelPrefix} ${i + 1} 삭제`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(i);
                }}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {lightboxIndex !== null ? (
        <ImageLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
