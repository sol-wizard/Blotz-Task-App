/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<593501159fa4bccbaf77ce2605fe18ec>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/AccessibilityInfo/legacySendAccessibilityEvent.js.flow
 */

/**
 * This is a function exposed to the React Renderer that can be used by the
 * pre-Fabric renderer to emit accessibility events to pre-Fabric nodes.
 */
declare function legacySendAccessibilityEvent(reactTag: number, eventType: string): void;
declare const $$legacySendAccessibilityEvent: typeof legacySendAccessibilityEvent;
declare type $$legacySendAccessibilityEvent = typeof $$legacySendAccessibilityEvent;
export default $$legacySendAccessibilityEvent;
