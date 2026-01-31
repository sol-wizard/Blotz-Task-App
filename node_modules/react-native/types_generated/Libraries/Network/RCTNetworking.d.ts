/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<3f91613e2b148c0f5abd6e28c951b840>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Network/RCTNetworking.js.flow
 */

import type { EventSubscription } from "../vendor/emitter/EventEmitter";
import type { RequestBody } from "./convertRequestBody";
import type { RCTNetworkingEventDefinitions } from "./RCTNetworkingEventDefinitions.flow";
import type { NativeResponseType } from "./XMLHttpRequest";
declare const RCTNetworking: {
  addListener<K extends keyof RCTNetworkingEventDefinitions>(eventType: K, listener: (...$$REST$$: RCTNetworkingEventDefinitions[K]) => unknown, context?: unknown): EventSubscription;
  sendRequest(method: string, trackingName: string | void, url: string, headers: {}, data: RequestBody, responseType: NativeResponseType, incrementalUpdates: boolean, timeout: number, callback: (requestId: number) => void, withCredentials: boolean): void;
  abortRequest(requestId: number): void;
  clearCookies(callback: (result: boolean) => void): void;
};
declare const $$RCTNetworking: typeof RCTNetworking;
declare type $$RCTNetworking = typeof $$RCTNetworking;
export default $$RCTNetworking;
