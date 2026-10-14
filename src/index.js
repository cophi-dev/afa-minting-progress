import './appCacheBootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { prefetchMintStatus } from './services/mintStatusCache';
import { loadBaycMapping } from './data/baycMetadata';
import { prefetchImageCids } from './utils/imageUrls';
import { startFaviconAnimation } from './utils/faviconAnimator';
import App from './App';
import './typography.css';

prefetchMintStatus();
loadBaycMapping();
prefetchImageCids();
startFaviconAnimation();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
