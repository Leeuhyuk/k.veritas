import { useEffect, useState } from 'react';

/**
 * @param {string} url
 * @param {string} errorMessage
 */
export function useFetchList(url, errorMessage) {
  const [all, setAll] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('load_failed');
        return r.json();
      })
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setAll(list);
        setStatus(list.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMsg(errorMessage);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [url, errorMessage]);

  return { all, status, errorMsg };
}
