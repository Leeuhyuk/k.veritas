import { excerpt, fmtDate } from '../lib/format.js';

/** 공지 목록 한 줄 */
export default function NewsItem({ item }) {
  if (!item || !item.id) return null;
  const summary = excerpt(item.body);
  return (
    <a className="news-item" href={`news-detail.html?id=${encodeURIComponent(item.id)}`}>
      <p className="news-item__date">{fmtDate(item.createdAt)}</p>
      <h3 className="news-item__title">{item.title}</h3>
      {summary ? <p className="news-item__excerpt">{summary}</p> : null}
    </a>
  );
}
