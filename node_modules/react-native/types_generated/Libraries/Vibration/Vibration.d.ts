/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a51b3dcd41b327df7432c7a8b508e073>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Vibration/Vibration.js
 */

declare const Vibration: {
  /**
   * Trigger a vibration with specified `pattern`.
   *
   * See https://reactnative.dev/docs/vibration#vibrate
   */
  vibrate: (pattern?: number | Array<number>, repeat?: boolean) => void;
  /**
   * Stop vibration
   *
   * See https://reactnative.dev/docs/vibration#cancel
   */
  cancel: () => void;
};
declare const $$Vibration: typeof Vibration;
declare type $$Vibration = typeof $$Vibration;
export default $$Vibration;
