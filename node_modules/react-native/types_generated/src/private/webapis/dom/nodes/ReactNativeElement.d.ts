/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c44ad056ff2eff9bac9f6514444684e0>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReactNativeElement.js
 */

import type { ViewConfig } from "../../../../../Libraries/Renderer/shims/ReactNativeTypes";
import type { HostInstance, MeasureInWindowOnSuccessCallback, MeasureLayoutOnSuccessCallback, MeasureOnSuccessCallback, NativeMethods } from "../../../types/HostInstance";
import type { InstanceHandle } from "./internals/NodeInternals";
import type ReactNativeDocument from "./ReactNativeDocument";
import ReadOnlyElement from "./ReadOnlyElement";
declare class ReactNativeElement extends ReadOnlyElement implements NativeMethods {
  constructor(tag: number, viewConfig: ViewConfig, instanceHandle: InstanceHandle, ownerDocument: ReactNativeDocument);
  get offsetHeight(): number;
  get offsetLeft(): number;
  get offsetParent(): ReadOnlyElement | null;
  get offsetTop(): number;
  get offsetWidth(): number;
  /**
   * React Native compatibility methods
   */

  blur(): void;
  focus(): void;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  measureLayout(relativeToNativeNode: number | HostInstance, onSuccess: MeasureLayoutOnSuccessCallback, onFail?: () => void): void;
  setNativeProps(nativeProps: {}): void;
}
export default ReactNativeElement;
