/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c44dc79dbc6228a581526ed1312e0bf9>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/BackHandler.js.flow
 */

export type BackPressEventName = "backPress" | "hardwareBackPress";
type TBackHandler = {
  exitApp(): void;
  addEventListener(eventName: BackPressEventName, handler: () => boolean | undefined): {
    remove: () => void;
  };
};
declare const BackHandler: TBackHandler;
declare const $$BackHandler: typeof BackHandler;
declare type $$BackHandler = typeof $$BackHandler;
export default $$BackHandler;
