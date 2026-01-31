/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

type DebuggerShellFlavor = "prebuilt" | "dev";
declare function unstable_spawnDebuggerShellWithArgs(
  args: string[],
  $$PARAM_1$$?: Readonly<{
    mode?: "syncThenExit" | "detached";
    flavor?: DebuggerShellFlavor;
    prebuiltBinaryPath?: string;
  }>,
): Promise<void>;
export type DebuggerShellPreparationResult = Readonly<{
  code:
    | "success"
    | "not_implemented"
    | "likely_offline"
    | "platform_not_supported"
    | "possible_corruption"
    | "unexpected_error";
  humanReadableMessage?: string;
  verboseInfo?: string;
}>;
/**
 * Attempts to prepare the debugger shell for use and returns a coded result
 * that can be used to advise the user on how to proceed in case of failure.
 * In particular, this function will attempt to download and extract an
 * appropriate binary for the "prebuilt" flavor.
 *
 * This function should be called early during dev server startup, in parallel
 * with other initialization steps, so that the debugger shell is ready to use
 * instantly when the user tries to open it (and conversely, the user is
 * informed ASAP if it is not ready to use).
 */
declare function unstable_prepareDebuggerShell(
  flavor: DebuggerShellFlavor,
  $$PARAM_1$$?: { prebuiltBinaryPath?: string },
): Promise<DebuggerShellPreparationResult>;
export { unstable_spawnDebuggerShellWithArgs, unstable_prepareDebuggerShell };
