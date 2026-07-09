import { useFetchList } from '../hooks/useFetchList.js';
import StatusMessage from '../components/StatusMessage.jsx';
import NewsItem from '../components/NewsItem.jsx';

export default function NewsApp() {
  const { all, status, errorMsg } = useFetchList(
    '/api/news',
    '소식을 불러오지 못했습니다. 서버(npm start)가 실행 중인지 확인해 주세요.'
  );

  if (status !== 'ready') {
    return (
      <StatusMessage status={status} emptyText="등록된 공지가 없습니다." errorMsg={errorMsg} />
    );
  }

  return (
    <div className="news-list">
      {all.map((n) => (
        <NewsItem key={n.id} item={n} />
      ))}
    </div>
  );
}
