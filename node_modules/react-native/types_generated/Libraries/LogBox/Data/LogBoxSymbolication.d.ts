/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<784e335d6b6a813d2e40818ce215bbd8>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/LogBox/Data/LogBoxSymbolication.js
 */

import type { SymbolicatedStackTrace } from "../../Core/Devtools/symbolicateStackTrace";
import type { StackFrame } from "../../Core/NativeExceptionsManager";
export type Stack = Array<StackFrame>;
export declare function deleteStack(stack: Stack): void;
export declare function symbolicate(stack: Stack, extraData?: unknown): Promise<SymbolicatedStackTrace>;
