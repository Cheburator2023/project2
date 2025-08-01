interface CustomAbortController {
    new (): CustomAbortController;
    abort(reason?: any): void;
    signal: CustomAbortSignal;
}

interface CustomAbortSignal {
    readonly aborted: boolean;
    onabort: ((this: CustomAbortSignal, ev: Event) => any) | null;
    reason?: any;
    throwIfAborted(): void;
}

declare global {
    var AbortController: {
        prototype: CustomAbortController;
        new(): CustomAbortController;
    };
    var AbortSignal: {
        prototype: CustomAbortSignal;
        new(): CustomAbortSignal;
    };
}

declare module 'node-abort-controller' {
    export class AbortController implements CustomAbortController {
        abort(reason?: any): void;
        signal: CustomAbortSignal;
    }

    export class AbortSignal implements CustomAbortSignal {
        readonly aborted: boolean;
        onabort: ((this: CustomAbortSignal, ev: Event) => any) | null;
        reason?: any;
        throwIfAborted(): void;
    }
}