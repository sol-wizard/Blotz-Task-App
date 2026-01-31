interface CodegenOptions {
    root: string;
    platform: string;
    reactNativePath: string;
    iosFolderPath: string;
}
declare function runCodegen(options: CodegenOptions): Promise<void>;
export default runCodegen;
//# sourceMappingURL=runCodegen.d.ts.map