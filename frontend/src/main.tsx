import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { jaJP } from '@clerk/localizations';
import { App } from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" が見つかりません。');
}

const root = createRoot(rootElement);

if (!CLERK_PUBLISHABLE_KEY) {
  root.render(
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>⚠️ VITE_CLERK_PUBLISHABLE_KEY が未設定です</h1>
      <p>
        <code>.env.local</code> に <code>VITE_CLERK_PUBLISHABLE_KEY</code> を設定してください。
      </p>
    </div>
  );
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} localization={jaJP}>
        <App />
      </ClerkProvider>
    </StrictMode>
  );
}
