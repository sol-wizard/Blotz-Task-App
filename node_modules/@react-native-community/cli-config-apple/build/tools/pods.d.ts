import { DependencyConfig } from '@react-native-community/cli-types';
import { ApplePlatform } from '../types';
import execa from 'execa';
interface ResolvePodsOptions {
    forceInstall?: boolean;
    newArchEnabled?: boolean;
}
interface NativeDependencies {
    [key: string]: DependencyConfig;
}
export declare function getPlatformDependencies(dependencies: NativeDependencies, platformName: ApplePlatform): string[];
export declare function dependenciesToString(dependencies: string[]): string;
export declare function generateMd5Hash(text: string): string;
export declare function compareMd5Hashes(hash1?: string, hash2?: string): boolean;
export default function resolvePods(root: string, sourceDir: string, nativeDependencies: NativeDependencies, platformName: ApplePlatform, reactNativePath: string, options?: ResolvePodsOptions): Promise<void>;
export declare function execaPod(args: string[], options?: execa.Options): Promise<execa.ExecaReturnValue<string>>;
export {};
//# sourceMappingURL=pods.d.ts.map