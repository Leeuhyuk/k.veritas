import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ResourcesApp from '../apps/ResourcesApp.jsx';

const el = document.getElementById('resources-root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <ResourcesApp />
    </StrictMode>
  );
}
