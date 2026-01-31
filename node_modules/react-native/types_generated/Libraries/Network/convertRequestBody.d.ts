/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b5754482a7f39e57ee417a19b7f8bf03>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Network/convertRequestBody.js
 */

import Blob from "../Blob/Blob";
import FormData from "./FormData";
export type RequestBody = string | Blob | FormData | {
  uri: string;
} | ArrayBuffer | ArrayBufferView;
declare function convertRequestBody(body: RequestBody): Object;
declare const $$convertRequestBody: typeof convertRequestBody;
declare type $$convertRequestBody = typeof $$convertRequestBody;
export default $$convertRequestBody;
