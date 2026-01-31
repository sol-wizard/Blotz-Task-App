/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b8b380270519d08a69a11f6eb8c6de43>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/UTFSequence.js
 */

declare const UTFSequence: {
  BOM: string;
  BULLET: string;
  BULLET_SP: string;
  MDASH: string;
  MDASH_SP: string;
  MIDDOT: string;
  MIDDOT_KATAKANA: string;
  MIDDOT_SP: string;
  NBSP: string;
  NDASH: string;
  NDASH_SP: string;
  NEWLINE: string;
  PIZZA: string;
  TRIANGLE_LEFT: string;
  TRIANGLE_RIGHT: string;
};
/**
 * A collection of Unicode sequences for various characters and emoji.
 *
 *  - More explicit than using the sequences directly in code.
 *  - Source code should be limited to ASCII.
 *  - Less chance of typos.
 */
declare const $$UTFSequence: typeof UTFSequence;
declare type $$UTFSequence = typeof $$UTFSequence;
export default $$UTFSequence;
