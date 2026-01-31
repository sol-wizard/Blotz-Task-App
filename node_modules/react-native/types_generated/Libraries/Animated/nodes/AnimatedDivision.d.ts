/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<247f8db413a727da6b8f026a830af5b8>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedDivision.js
 */

import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedNode from "./AnimatedNode";
import AnimatedWithChildren from "./AnimatedWithChildren";
declare class AnimatedDivision extends AnimatedWithChildren {
  constructor(a: AnimatedNode | number, b: AnimatedNode | number, config?: null | undefined | AnimatedNodeConfig);
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
}
export default AnimatedDivision;
