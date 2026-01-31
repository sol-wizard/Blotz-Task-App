/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<57f5c4997d2c1d25e440d544c2ffc8bd>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/registerCallableModule.js
 */

type Module = {};
type RegisterCallableModule = (name: string, moduleOrFactory: Module | (($$PARAM_0$$: void) => Module)) => void;
declare const registerCallableModule: RegisterCallableModule;
declare const $$registerCallableModule: typeof registerCallableModule;
declare type $$registerCallableModule = typeof $$registerCallableModule;
export default $$registerCallableModule;
