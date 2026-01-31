import { IOSProjectInfo } from '@react-native-community/cli-types';
import { ApplePlatform } from '../../types';
type Options = {
    buildOutput: string;
    xcodeProject: IOSProjectInfo;
    mode: string;
    scheme: string;
    target?: string;
    udid: string;
    binaryPath?: string;
    platform?: ApplePlatform;
    isSimulator?: boolean;
};
export default function installApp({ buildOutput, xcodeProject, mode, scheme, target, udid, binaryPath, platform, isSimulator, }: Options): Promise<void>;
export {};
//# sourceMappingURL=installApp.d.ts.map