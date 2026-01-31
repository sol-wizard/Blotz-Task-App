/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<9d2db5a3996e7bc8e523f587784ccbbe>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/codegenNativeCommands.js
 */

type NativeCommandsOptions<T = string> = Readonly<{
  supportedCommands: ReadonlyArray<T>;
}>;
declare function codegenNativeCommands<T extends {}>(options: NativeCommandsOptions<keyof T>): T;
declare const $$codegenNativeCommands: typeof codegenNativeCommands;
declare type $$codegenNativeCommands = typeof $$codegenNativeCommands;
export default $$codegenNativeCommands;
