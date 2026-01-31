/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<43d341222a408749f0d4f0e08b0cafff>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Network/RCTNetworkingEventDefinitions.flow.js
 */

export type RCTNetworkingEventDefinitions = Readonly<{
  didSendNetworkData: [[number, number, number]];
  didReceiveNetworkResponse: [[number, number, {
    [$$Key$$: string]: string;
  } | undefined, string | undefined]];
  didReceiveNetworkData: [[number, string]];
  didReceiveNetworkIncrementalData: [[number, string, number, number]];
  didReceiveNetworkDataProgress: [[number, number, number]];
  didCompleteNetworkResponse: [[number, string, boolean]];
}>;
