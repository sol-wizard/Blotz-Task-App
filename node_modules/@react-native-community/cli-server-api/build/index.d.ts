/// <reference types="ws" />
import connect from 'connect';
type MiddlewareOptions = {
    host?: string;
    watchFolders: ReadonlyArray<string>;
    port: number;
};
export declare function createDevServerMiddleware(options: MiddlewareOptions): {
    websocketEndpoints: {
        '/message': import("ws").Server;
        '/events': import("ws").Server;
    };
    messageSocketEndpoint: {
        server: import("ws").Server;
        broadcast: (method: string, params?: Record<string, any> | undefined) => void;
    };
    eventsSocketEndpoint: {
        server: import("ws").Server;
        reportEvent: (event: any) => void;
    };
    middleware: connect.Server;
};
export {};
//# sourceMappingURL=index.d.ts.map