/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<e9a428e9f981253b8bbd32f8675241d7>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/LayoutConformance/LayoutConformance.js
 */

import * as React from "react";
export type LayoutConformanceProps = Readonly<{
  /**
   * strict: Layout in accordance with W3C spec, even when breaking
   * compatibility: Layout with the same behavior as previous versions of React Native
   */
  mode: "strict" | "compatibility";
  children: React.ReactNode;
}>;
declare const $$LayoutConformance: (props: LayoutConformanceProps) => React.ReactNode;
declare type $$LayoutConformance = typeof $$LayoutConformance;
export default $$LayoutConformance;
