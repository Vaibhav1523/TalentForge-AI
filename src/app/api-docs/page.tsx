'use client';

import { useEffect } from 'react';
import { SITE_LOGO_SRC } from '@/lib/site-brand';

const SWAGGER_UI_SCRIPT = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
const SWAGGER_UI_CSS = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';

declare global {
  interface Window {
    SwaggerUIBundle?: {
      (opts: {
        url: string;
        dom_id: string;
        presets: unknown[];
        layout: string;
        deepLinking?: boolean;
        persistAuthorization?: boolean;
      }): void;
      presets?: { apis: unknown };
    };
    SwaggerUIStandalonePreset?: unknown;
  }
}

export default function ApiDocsPage() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = SWAGGER_UI_CSS;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = SWAGGER_UI_SCRIPT;
    script.async = true;
    script.onload = () => {
      const { SwaggerUIBundle, SwaggerUIStandalonePreset } = window;
      if (!SwaggerUIBundle) return;
      const presets = [SwaggerUIBundle.presets?.apis].filter(Boolean);
      if (SwaggerUIStandalonePreset) presets.push(SwaggerUIStandalonePreset);
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: presets.length ? presets : [SwaggerUIBundle],
        layout: SwaggerUIStandalonePreset ? 'StandaloneLayout' : 'BaseLayout',
        deepLinking: true,
        persistAuthorization: true,
      });
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
      const swaggerEl = document.getElementById('swagger-ui');
      if (swaggerEl) swaggerEl.innerHTML = '';
    };
  }, []);

  return (
    <div className="api-docs-wrapper" style={{ minHeight: '100vh', background: '#fafafa' }}>
      <div className="api-docs-header" style={{ padding: '16px 24px', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src={SITE_LOGO_SRC} alt="" width={40} height={40} style={{ objectFit: 'contain', flexShrink: 0 }} decoding="async" />
        <div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>HookStep API Documentation</h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
          REST API for jobs, applications, profile, and company dashboard. Protected routes require a NextAuth session (sign in via the app).
        </p>
        </div>
      </div>
      <div id="swagger-ui" />
    </div>
  );
}
