/// <reference types="vite/client" />

// Only the variables declared here exist on import.meta.env (no index
// signature). Add new VITE_* variables here and to src/config/schema.ts.
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_PROVIDER?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
