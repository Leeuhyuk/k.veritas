import { fmtDate } from '../lib/format.js';

/** 자료실 테이블 한 행 */
export default function ResourceRow({ item }) {
  if (!item || !item.id) return null;
  const detail = `resource-detail.html?id=${encodeURIComponent(item.id)}`;
  // Storage 직접 URL이 있으면 사용 (GitHub Pages 등 정적 호스팅 대응)
  const fileUrl = item.file && /^https?:\/\//i.test(item.file) ? item.file : null;
  const download = fileUrl || `/api/resources/${encodeURIComponent(item.id)}/download`;

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
          {...(fileUrl ? { target: '_blank', rel: 'noreferrer' } : {})}
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
