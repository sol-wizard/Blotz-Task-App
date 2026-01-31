/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ac306758ba96ec285eb6d3c284b0c968>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/RawEventEmitter.js
 */

import type { IEventEmitter } from "../vendor/emitter/EventEmitter";
export type RawEventEmitterEvent = Readonly<{
  eventName: string;
  nativeEvent: {
    [$$Key$$: string]: unknown;
  };
}>;
type RawEventDefinitions = {
  [eventChannel: string]: [RawEventEmitterEvent];
};
declare const RawEventEmitter: IEventEmitter<RawEventDefinitions>;
declare const $$RawEventEmitter: typeof RawEventEmitter;
declare type $$RawEventEmitter = typeof $$RawEventEmitter;
export default $$RawEventEmitter;
