/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<2c1c664fc25ce87f5d4fea5e5002461f>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/RendererImplementation.js
 */

import type { HostInstance } from "../../src/private/types/HostInstance";
import type $$IMPORT_TYPEOF_1$$ from "../Renderer/shims/ReactFabric";
type ReactFabricType = typeof $$IMPORT_TYPEOF_1$$;
import type $$IMPORT_TYPEOF_2$$ from "../Renderer/shims/ReactNative";
type ReactNativeType = typeof $$IMPORT_TYPEOF_2$$;
import type { RootTag } from "./RootTag";
import * as React from "react";
export declare function renderElement($$PARAM_0$$: {
  element: React.JSX.Element;
  rootTag: number;
  useFabric: boolean;
  useConcurrentRoot: boolean;
}): void;
export declare function dispatchCommand(handle: HostInstance, command: string, args: Array<unknown>): void;
export declare const findHostInstance_DEPRECATED: <TElementType extends React.ElementType>(componentOrHandle: null | undefined | (React.ComponentRef<TElementType> | number)) => null | undefined | HostInstance;
export declare type findHostInstance_DEPRECATED = typeof findHostInstance_DEPRECATED;
export declare const findNodeHandle: <TElementType extends React.ElementType>(componentOrHandle: null | undefined | (React.ComponentRef<TElementType> | number)) => null | undefined | number;
export declare type findNodeHandle = typeof findNodeHandle;
export declare const sendAccessibilityEvent: ReactNativeType["sendAccessibilityEvent"];
export declare type sendAccessibilityEvent = typeof sendAccessibilityEvent;
/**
 * This method is used by AppRegistry to unmount a root when using the old
 * React Native renderer (Paper).
 */
export declare const unmountComponentAtNodeAndRemoveContainer: (rootTag: RootTag) => void;
export declare type unmountComponentAtNodeAndRemoveContainer = typeof unmountComponentAtNodeAndRemoveContainer;
export declare const unstable_batchedUpdates: ReactNativeType["unstable_batchedUpdates"];
export declare type unstable_batchedUpdates = typeof unstable_batchedUpdates;
export declare const isChildPublicInstance: ReactNativeType["isChildPublicInstance"];
export declare type isChildPublicInstance = typeof isChildPublicInstance;
export declare const getNodeFromInternalInstanceHandle: ReactFabricType["getNodeFromInternalInstanceHandle"];
export declare type getNodeFromInternalInstanceHandle = typeof getNodeFromInternalInstanceHandle;
export declare const getPublicInstanceFromInternalInstanceHandle: ReactFabricType["getPublicInstanceFromInternalInstanceHandle"];
export declare type getPublicInstanceFromInternalInstanceHandle = typeof getPublicInstanceFromInternalInstanceHandle;
export declare const getPublicInstanceFromRootTag: ReactFabricType["getPublicInstanceFromRootTag"];
export declare type getPublicInstanceFromRootTag = typeof getPublicInstanceFromRootTag;
export declare function isProfilingRenderer(): boolean;
