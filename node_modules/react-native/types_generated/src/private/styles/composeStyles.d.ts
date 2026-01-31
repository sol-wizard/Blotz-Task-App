/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ebc5447e24461b23e9aff624a393f79a>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/src/private/styles/composeStyles.js
 */

/**
 * Combines two styles such that `style2` will override any styles in `style1`.
 * If either style is null or undefined, the other one is returned without
 * allocating an array, saving allocations and enabling memoization.
 */
declare function composeStyles<T, U extends T, V extends T>(style1: null | undefined | U, style2: null | undefined | V): null | undefined | (T | ReadonlyArray<T>);
export default composeStyles;
