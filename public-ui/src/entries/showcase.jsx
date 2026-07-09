import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ShowcaseApp from '../apps/ShowcaseApp.jsx';

const el = document.getElementById('showcase-root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <ShowcaseApp />
    </StrictMode>
  );
}
