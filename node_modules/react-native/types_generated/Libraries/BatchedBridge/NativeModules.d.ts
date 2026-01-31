/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<f9572ddd3b622042ac2293eb8bda1fb9>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/BatchedBridge/NativeModules.js
 */

export type ModuleConfig = [string, null | undefined | {}, null | undefined | ReadonlyArray<string>, null | undefined | ReadonlyArray<number>, null | undefined | ReadonlyArray<number>];
export type MethodType = "async" | "promise" | "sync";
declare let NativeModules: {
  [moduleName: string]: any;
};
declare const $$NativeModules: typeof NativeModules;
declare type $$NativeModules = typeof $$NativeModules;
export default $$NativeModules;
