/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<80c83bedee640e6655ec1f591794fd98>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/ExtendedError.js
 */

export type ExtendedError = Error & {
  jsEngine?: string;
  preventSymbolication?: boolean;
  componentStack?: string;
  isComponentError?: boolean;
  type?: string;
  cause?: {
    name: string;
    message: string;
    stackElements?: ReadonlyArray<Object>;
    stackSymbols?: ReadonlyArray<Object>;
    stackReturnAddresses?: ReadonlyArray<Object>;
  };
};
