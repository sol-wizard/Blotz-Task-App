/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<284ea1b9e7360755130c190b7975246f>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/nodes/AnimatedDiffClamp.js
 */

import type { InterpolationConfigType } from "./AnimatedInterpolation";
import type AnimatedNode from "./AnimatedNode";
import type { AnimatedNodeConfig } from "./AnimatedNode";
import AnimatedInterpolation from "./AnimatedInterpolation";
import AnimatedWithChildren from "./AnimatedWithChildren";
declare class AnimatedDiffClamp extends AnimatedWithChildren {
  constructor(a: AnimatedNode, min: number, max: number, config?: null | undefined | AnimatedNodeConfig);
  interpolate<OutputT extends number | string>(config: InterpolationConfigType<OutputT>): AnimatedInterpolation<OutputT>;
}
export default AnimatedDiffClamp;
