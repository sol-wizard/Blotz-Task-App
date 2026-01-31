/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<f22a967c504c5b16003e3a93b653a94c>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/RootTag.js
 */

import * as React from "react";
export declare type RootTag = symbol & {
  __RootTag__: string;
};
export declare const RootTagContext: React.Context<RootTag>;
export declare type RootTagContext = typeof RootTagContext;
/**
 * Intended to only be used by `AppContainer`.
 */
export declare function createRootTag(rootTag: number | RootTag): RootTag;
