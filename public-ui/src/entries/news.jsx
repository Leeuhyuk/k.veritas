import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import NewsApp from '../apps/NewsApp.jsx';

const el = document.getElementById('news-root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <NewsApp />
    </StrictMode>
  );
}
