/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<6c68fe70868f9b5a459c48ac3609b922>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/I18nManager.js
 */

import type { I18nManagerConstants } from "./NativeI18nManager";
declare const $$I18nManager: {
  getConstants: () => I18nManagerConstants;
  allowRTL: (shouldAllow: boolean) => void;
  forceRTL: (shouldForce: boolean) => void;
  swapLeftAndRightInRTL: (flipStyles: boolean) => void;
  isRTL: I18nManagerConstants["isRTL"];
  doLeftAndRightSwapInRTL: I18nManagerConstants["doLeftAndRightSwapInRTL"];
};
declare type $$I18nManager = typeof $$I18nManager;
export default $$I18nManager;
