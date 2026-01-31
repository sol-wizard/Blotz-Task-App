/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<e21f3e0688e298327a0138abb48b9964>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Types/UIManagerJSInterface.js
 */

import type { Spec } from "../ReactNative/NativeUIManager";
export interface UIManagerJSInterface extends Spec {
  readonly getViewManagerConfig: (viewManagerName: string) => Object;
  readonly hasViewManagerConfig: (viewManagerName: string) => boolean;
}
