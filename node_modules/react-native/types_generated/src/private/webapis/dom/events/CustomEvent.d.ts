/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<2dccfc7c0ad34e6db1b4b410a5ab5eea>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/events/CustomEvent.js
 */

/**
 * This module implements the `CustomEvent` interface from the DOM.
 * See https://dom.spec.whatwg.org/#interface-customevent.
 */

import type { EventInit } from "./Event";
import Event from "./Event";
export interface CustomEventInit extends EventInit {
  readonly detail?: unknown;
}
declare class CustomEvent extends Event {
  constructor(type: string, options?: null | undefined | CustomEventInit);
  get detail(): unknown;
}
export default CustomEvent;
