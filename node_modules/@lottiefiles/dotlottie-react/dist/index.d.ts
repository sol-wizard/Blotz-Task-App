import { DotLottie, DotLottieWorker, Config } from '@lottiefiles/dotlottie-web';
export * from '@lottiefiles/dotlottie-web';
import { ComponentProps, RefCallback, JSX as JSX$1 } from 'react';

type BaseDotLottieProps<T extends DotLottie | DotLottieWorker> = Omit<Config, 'canvas'> & ComponentProps<'canvas'> & {
    animationId?: string;
    /**
     * A function that creates a `DotLottie` or `DotLottieWorker` instance.
     */
    createDotLottie: (config: T extends DotLottieWorker ? Config & {
        workerId?: string;
    } : Config) => T;
    /**
     * A callback function that receives the `DotLottie` or `DotLottieWorker` instance.
     *
     * @example
     * ```tsx
     * const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
     *
     * <DotLottieReact
     *   dotLottieRefCallback={setDotLottie}
     * />
     * ```
     */
    dotLottieRefCallback?: RefCallback<T | null>;
    /**
     * @deprecated The `playOnHover` property is deprecated.
     * Instead, use the `onMouseEnter` and `onMouseLeave` events to control animation playback.
     * Utilize the `dotLottieRefCallback` to access the `DotLottie` instance and invoke the `play` and `pause` methods.
     *
     * Example usage:
     * ```tsx
     * const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
     *
     * <DotLottieReact
     *   dotLottieRefCallback={setDotLottie}
     *   onMouseEnter={() => dotLottie?.play()}
     *   onMouseLeave={() => dotLottie?.pause()}
     * />
     * ```
     */
    playOnHover?: boolean;
    themeData?: string;
    workerId?: T extends DotLottieWorker ? string : undefined;
};

type DotLottieReactProps = Omit<BaseDotLottieProps<DotLottie>, 'createDotLottie'>;
declare const DotLottieReact: (props: DotLottieReactProps) => JSX$1.Element;

type DotLottieWorkerReactProps = Omit<BaseDotLottieProps<DotLottieWorker>, 'createDotLottie'>;
declare const DotLottieWorkerReact: (props: DotLottieWorkerReactProps) => JSX.Element;

declare const setWasmUrl: (url: string) => void;

export { DotLottieReact, type DotLottieReactProps, DotLottieWorkerReact, type DotLottieWorkerReactProps, setWasmUrl };
