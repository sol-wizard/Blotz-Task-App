/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<e6cfac80b368b1a3e962fdc2fbac77de>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/StyleSheet/PlatformColorValueTypes.js.flow
 */

import type { ProcessedColorValue } from "./processColor";
import type { ColorValue, NativeColorValue } from "./StyleSheet";
export declare function PlatformColor(...names: Array<string>): ColorValue;
export declare function normalizeColorObject(color: NativeColorValue): null | undefined | ProcessedColorValue;
export declare function processColorObject(color: NativeColorValue): null | undefined | NativeColorValue;
