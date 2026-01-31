/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<e0d2ed06b7508b8127df565e426e1352>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/virtualized-lists/Lists/StateSafePureComponent.js
 */

import * as React from "react";
/**
 * `setState` is called asynchronously, and should not rely on the value of
 * `this.props` or `this.state`:
 * https://react.dev/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous
 *
 * SafePureComponent adds runtime enforcement, to catch cases where these
 * variables are read in a state updater function, instead of the ones passed
 * in.
 */
declare class StateSafePureComponent<Props, State extends {}> extends React.PureComponent<Props, State> {
  constructor(props: Props);
  setState<K extends keyof State>(partialState: null | undefined | (Pick<State, K> | (($$PARAM_0$$: State, $$PARAM_1$$: Props) => null | undefined | Pick<State, K>)), callback?: () => unknown): void;
}
export default StateSafePureComponent;
