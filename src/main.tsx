import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import { createCtx } from '@reatom/framework';
import { reatomContext } from '@reatom/npm-react';
import { App } from './App';

import '@radix-ui/themes/styles.css';
import '@/assets/scss/main.scss';

const ctx = createCtx();
const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <reatomContext.Provider value={ctx}>
      <Theme>
        <App />
      </Theme>
    </reatomContext.Provider>
  </StrictMode>,
);
