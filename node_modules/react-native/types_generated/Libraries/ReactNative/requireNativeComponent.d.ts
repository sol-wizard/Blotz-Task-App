/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<535a7e8c3a1300512c070aa8d8182c1a>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/requireNativeComponent.js
 */

import type { HostComponent } from "../../src/private/types/HostComponent";
declare const requireNativeComponent: <T extends {}>(uiViewClassName: string) => HostComponent<T>;
/**
 * Creates values that can be used like React components which represent native
 * view managers. You should create JavaScript modules that wrap these values so
 * that the results are memoized. Example:
 *
 *   const View = requireNativeComponent('RCTView');
 *
 */
declare const $$requireNativeComponent: typeof requireNativeComponent;
declare type $$requireNativeComponent = typeof $$requireNativeComponent;
export default $$requireNativeComponent;
