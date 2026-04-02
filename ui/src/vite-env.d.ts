/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare global {
  interface Window {
    Vue: typeof import('vue');
    VueRouter: typeof import('vue-router');
    AcuDice: import('./api').AcuDiceAPI;
    AutoCardUpdaterAPI: any;
    TavernHelper?: {
      triggerSlash: (command: string) => Promise<void>;
      getCurrentCharacterId: () => string;
      getCharacter: (id: string) => any;
    };
    toastr: {
      success: (message: string, title?: string) => void;
      error: (message: string, title?: string) => void;
      warning: (message: string, title?: string) => void;
      info: (message: string, title?: string) => void;
    };
    eventEmit?: (event: string, data?: any) => void;
    eventOn?: (event: string, callback: (data: any) => void) => void;
  }
}

export {};
