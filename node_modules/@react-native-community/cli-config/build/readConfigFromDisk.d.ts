import type { UserConfig, UserDependencyConfig } from '@react-native-community/cli-types';
/**
 * Reads a project configuration as defined by the user in the current
 * workspace.
 */
export declare function readConfigFromDiskAsync(rootFolder: string): Promise<UserConfig>;
/**
 * Reads a project configuration as defined by the user in the current
 * workspace synchronously.
 */
export declare function readConfigFromDisk(rootFolder: string): UserConfig;
/**
 * Reads a dependency configuration as defined by the developer
 * inside `node_modules`.
 */
export declare function readDependencyConfigFromDiskAsync(rootFolder: string, dependencyName: string): Promise<UserDependencyConfig>;
/**
 * Reads a dependency configuration as defined by the developer
 * inside `node_modules` synchronously.
 */
export declare function readDependencyConfigFromDisk(rootFolder: string, dependencyName: string): UserDependencyConfig;
//# sourceMappingURL=readConfigFromDisk.d.ts.map