/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<4fb9efab93fb4702e15de0553054091f>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/animations/Animation.js
 */

import type { PlatformConfig } from "../AnimatedPlatformConfig";
import type AnimatedValue from "../nodes/AnimatedValue";
export type EndResult = {
  finished: boolean;
  value?: number;
  offset?: number;
};
export type EndCallback = (result: EndResult) => void;
export type AnimationConfig = Readonly<{
  isInteraction?: boolean;
  useNativeDriver: boolean;
  platformConfig?: PlatformConfig;
  onComplete?: EndCallback | undefined;
  iterations?: number;
  isLooping?: boolean;
  debugID?: string | undefined;
}>;
declare class Animation {
  constructor(config: AnimationConfig);
  start(fromValue: number, onUpdate: (value: number) => void, onEnd: null | undefined | EndCallback, previousAnimation: null | undefined | Animation, animatedValue: AnimatedValue): void;
  stop(): void;
}
export default Animation;
