// Tauri API type definitions
interface Window {
  __TAURI__?: {
    event: {
      listen: (event: string, handler: (event: any) => void) => Promise<() => void>;
      emit: (event: string, payload?: any) => Promise<void>;
    };
    fs: {
      readBinaryFile: (path: string) => Promise<Uint8Array>;
    };
    path: {
      basename: (path: string) => Promise<string>;
    };
  };
}

