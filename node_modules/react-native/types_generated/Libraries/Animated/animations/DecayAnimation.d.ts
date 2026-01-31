/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<7385fd5e71640f4c18287ec1c64d91b7>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/animations/DecayAnimation.js
 */

import type AnimatedValue from "../nodes/AnimatedValue";
import type { AnimationConfig, EndCallback } from "./Animation";
import Animation from "./Animation";
export type DecayAnimationConfig = Readonly<Omit<AnimationConfig, keyof {
  velocity: number | Readonly<{
    x: number;
    y: number;
  }>;
  deceleration?: number;
}> & {
  velocity: number | Readonly<{
    x: number;
    y: number;
  }>;
  deceleration?: number;
}>;
export type DecayAnimationConfigSingle = Readonly<Omit<AnimationConfig, keyof {
  velocity: number;
  deceleration?: number;
}> & {
  velocity: number;
  deceleration?: number;
}>;
declare class DecayAnimation extends Animation {
  constructor(config: DecayAnimationConfigSingle);
  start(fromValue: number, onUpdate: (value: number) => void, onEnd: null | undefined | EndCallback, previousAnimation: null | undefined | Animation, animatedValue: AnimatedValue): void;
  onUpdate(): void;
  stop(): void;
}
export default DecayAnimation;
