import { fmtDate } from '../lib/format.js';

/** 자료실 테이블 한 행 */
export default function ResourceRow({ item }) {
  if (!item || !item.id) return null;
  const detail = `resource-detail.html?id=${encodeURIComponent(item.id)}`;
  // Storage 직접 URL 우선 (GitHub Pages에는 /api/.../download 없음)
  const fileUrl = item.file && /^https?:\/\//i.test(item.file) ? item.file : null;
  const apiDl = `/api/resources/${encodeURIComponent(item.id)}/download`;
  const download =
    fileUrl ||
    (typeof window !== 'undefined' && typeof window.withSiteBase === 'function'
      ? window.withSiteBase(apiDl)
      : apiDl);
  const fname = item.originalName || item.title || 'download';

  return (
    <tr className="res-row">
      <td className="res-col-cat" data-label="분류">
        <span className="tag">{item.category || '기타'}</span>
      </td>
      <td data-label="제목">
        <a className="res-title" href={detail}>
          {item.title}
        </a>
      </td>
      <td className="res-col-file" data-label="첨부">
        <a className="btn btn--ghost btn--sm" href={detail}>
          상세보기
        </a>
        <a
          className="btn btn--ghost btn--sm"
          href={download}
          download={fname}
          data-force-download="1"
          data-download-name={fname}
          onClick={(e) => {
            if (typeof window !== 'undefined' && typeof window.forceDownload === 'function') {
              e.preventDefault();
              window.forceDownload(download, fname);
            }
          }}
        >
          다운로드
        </a>
      </td>
      <td className="res-col-date" data-label="등록일">
        <span className="res-meta">{fmtDate(item.createdAt)}</span>
      </td>
    </tr>
  );
}
