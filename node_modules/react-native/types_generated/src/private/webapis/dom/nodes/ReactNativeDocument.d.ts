/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<89658b382ce5596f4a611ee2c2ae6bb5>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReactNativeDocument.js
 */

import type { RootTag } from "../../../../../Libraries/ReactNative/RootTag";
import type HTMLCollection from "../oldstylecollections/HTMLCollection";
import type { ReactNativeDocumentInstanceHandle } from "./internals/ReactNativeDocumentInstanceHandle";
import ReactNativeElement from "./ReactNativeElement";
import ReadOnlyElement from "./ReadOnlyElement";
import ReadOnlyNode from "./ReadOnlyNode";
declare class ReactNativeDocument extends ReadOnlyNode {
  constructor(rootTag: RootTag, instanceHandle: ReactNativeDocumentInstanceHandle);
  get childElementCount(): number;
  get children(): HTMLCollection<ReadOnlyElement>;
  get documentElement(): ReactNativeElement;
  get firstElementChild(): ReadOnlyElement | null;
  get lastElementChild(): ReadOnlyElement | null;
  get nodeName(): string;
  get nodeType(): number;
  get nodeValue(): null;
  get textContent(): null;
  getElementById(id: string): ReadOnlyElement | null;
}
export default ReactNativeDocument;
export declare function createReactNativeDocument(rootTag: RootTag): ReactNativeDocument;
