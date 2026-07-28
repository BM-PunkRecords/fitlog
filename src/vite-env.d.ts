/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_DEFAULT_REST_SECONDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.json' {
  const value: unknown
  export default value
}
