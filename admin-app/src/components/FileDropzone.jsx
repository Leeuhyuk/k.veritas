import { useEffect, useRef, useState } from 'react';
import ImageLightbox from './ImageLightbox.jsx';

function fileKey(f) {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(f) {
  return f && typeof f.type === 'string' && f.type.startsWith('image/');
}

/**
 * 클릭 선택 + 드래그앤드롭 파일 첨부
 * - multiple: 추가 선택 시 기존 목록에 누적 (중복 제외)
 * - 이미지 미리보기 / 일반 파일 칩 + 개별 삭제
 * - 썸네일 클릭 시 확대 팝업
 *
 * @param {File[]} files
 * @param {(files: File[]) => void} onChange
 */
export default function FileDropzone({
  accept,
  multiple = false,
  files = [],
  onChange,
  label = '파일을 끌어다 놓으세요',
  sublabel = '또는 클릭해서 탐색기에서 선택',
  required = false,
  id,
  maxFiles = 8,
}) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const urls = files.map((f) => (isImageFile(f) ? URL.createObjectURL(f) : null));
    setPreviewUrls(urls);
    setLightboxIndex(null);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  function mergeIncoming(incoming) {
    const list = Array.from(incoming || []);
    if (!list.length) return;

    if (!multiple) {
      onChange(list.slice(0, 1));
      return;
    }

    const seen = new Set(files.map(fileKey));
    const next = files.slice();
    for (const f of list) {
      if (next.length >= maxFiles) break;
      const k = fileKey(f);
      if (seen.has(k)) continue;
      seen.add(k);
      next.push(f);
    }
    onChange(next);
  }

  function removeAt(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    mergeIncoming(e.dataTransfer.files);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setOver(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOver(false);
  }

  const countLabel =
    multiple && files.length
      ? `${files.length}${maxFiles ? ` / ${maxFiles}` : ''}개 선택됨`
      : null;

  // 확대 팝업용: 이미지 파일만 순서대로
  const imageItems = [];
  const fileToImageItemIndex = files.map((f, i) => {
    if (!previewUrls[i]) return -1;
    const idx = imageItems.length;
    imageItems.push({ src: previewUrls[i], name: f.name });
    return idx;
  });

  return (
    <div className="file-drop-wrap">
      <div
        className={`file-drop${over ? ' is-over' : ''}${files.length ? ' has-files' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current && inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current && inputRef.current.click();
          }
        }}
        aria-label={label}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required && !files.length}
          className="file-drop__input"
          onChange={(e) => {
            mergeIncoming(e.target.files);
            e.target.value = '';
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="file-drop__icon" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V7m0 0l-3.5 3.5M12 7l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="file-drop__label">{label}</p>
        <p className="file-drop__sub">
          {sublabel}
          {countLabel ? ` · ${countLabel}` : ''}
        </p>
      </div>

      {files.length ? (
        <ul className="file-drop__previews" aria-label="첨부 미리보기">
          {files.map((f, i) => {
            const url = previewUrls[i];
            const image = !!url;
            const imageItemIdx = fileToImageItemIndex[i];
            return (
              <li
                key={fileKey(f) + '-' + i}
                className={`file-preview${image ? ' is-image' : ' is-file'}`}
              >
                {image ? (
                  <button
                    type="button"
                    className="file-preview__open"
                    onClick={() => setLightboxIndex(imageItemIdx)}
                    aria-label={`${f.name} 크게 보기`}
                  >
                    <img className="file-preview__thumb" src={url} alt={f.name} />
                    <span className="file-preview__zoom" aria-hidden="true">
                      확대
                    </span>
                  </button>
                ) : (
                  <div className="file-preview__icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 3h6l5 5v11a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </div>
                )}
                <div className="file-preview__meta">
                  <span className="file-preview__name" title={f.name}>
                    {f.name}
                  </span>
                  <span className="file-preview__size">
                    {formatSize(f.size)}
                    {image ? ' · 클릭 확대' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="file-preview__remove"
                  aria-label={`${f.name} 삭제`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeAt(i);
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {lightboxIndex !== null && imageItems.length ? (
        <ImageLightbox
          items={imageItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
