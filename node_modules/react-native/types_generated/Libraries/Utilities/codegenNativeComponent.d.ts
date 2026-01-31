/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b41446a6833629c8e75df38d7d0adfc9>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/codegenNativeComponent.js
 */

import type { HostComponent } from "../../src/private/types/HostComponent";
type NativeComponentOptions = Readonly<{
  interfaceOnly?: boolean;
  paperComponentName?: string;
  paperComponentNameDeprecated?: string;
  excludedPlatforms?: ReadonlyArray<"iOS" | "android">;
}>;
export type NativeComponentType<T extends {}> = HostComponent<T>;
declare function codegenNativeComponent<Props extends {}>(componentName: string, options?: NativeComponentOptions): NativeComponentType<Props>;
declare const $$codegenNativeComponent: typeof codegenNativeComponent;
declare type $$codegenNativeComponent = typeof $$codegenNativeComponent;
export default $$codegenNativeComponent;
