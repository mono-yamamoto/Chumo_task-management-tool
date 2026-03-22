import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { jaJP } from '@clerk/localizations';
import { App } from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  createRoot(document.getElementById('root')!).render(
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>⚠️ VITE_CLERK_PUBLISHABLE_KEY が未設定です</h1>
      <p>
        <code>.env.local</code> に <code>VITE_CLERK_PUBLISHABLE_KEY</code> を設定してください。
      </p>
    </div>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} localization={jaJP}>
        <App />
      </ClerkProvider>
    </StrictMode>
  );
}
