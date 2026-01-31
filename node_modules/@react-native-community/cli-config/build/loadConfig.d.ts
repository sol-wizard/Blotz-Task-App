import { Config } from '@react-native-community/cli-types';
/**
 * Loads CLI configuration
 */
export default function loadConfig({ projectRoot, selectedPlatform, }: {
    projectRoot?: string;
    selectedPlatform?: string;
}): Config;
/**
 * Load CLI configuration asynchronously, which supports reading ESM modules.
 */
export declare function loadConfigAsync({ projectRoot, selectedPlatform, }: {
    projectRoot?: string;
    selectedPlatform?: string;
}): Promise<Config>;
//# sourceMappingURL=loadConfig.d.ts.map