/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import type { DebuggerShellPreparationResult } from "./BrowserLauncher";
type SuccessResult<Props extends {} | void = {}> =
  /**
   * > 15 |   ...Props,
   *      |   ^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any;
type ErrorResult<ErrorT = unknown, Props extends {} | void = {}> =
  /**
   * > 22 |   ...Props,
   *      |   ^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any;
type CodedErrorResult<ErrorCode extends string> = {
  status: "coded_error";
  errorCode: ErrorCode;
  errorDetails?: string;
};
export type DebuggerSessionIDs = {
  appId: string | null;
  deviceName: string | null;
  deviceId: string | null;
  pageId: string | null;
};
export type ConnectionUptime = { connectionUptime: number };
export type ReportableEvent =
  | /**
   * > 46 |       ...
   *      |       ^^^
   * > 47 |         | SuccessResult<{
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 48 |             targetDescription: string,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 49 |             prefersFuseboxFrontend: boolean,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 50 |             ...DebuggerSessionIDs,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 51 |           }>
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 52 |         | ErrorResult<mixed>
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 53 |         | CodedErrorResult<"NO_APPS_FOUND">,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 57 |       ...
   *      |       ^^^
   * > 58 |         | SuccessResult<{
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 59 |             ...DebuggerSessionIDs,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 60 |             frontendUserAgent: string | null,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 61 |           }>
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^
   * > 62 |         | ErrorResult<mixed, DebuggerSessionIDs>,
   *      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 72 |       ...DebuggerSessionIDs,
   *      |       ^^^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 89 |       ...DebuggerSessionIDs,
   *      |       ^^^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | { type: "fusebox_console_notice" }
  | /**
   * > 96 |       ...DebuggerSessionIDs,
   *      |       ^^^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 105 |       ...ConnectionUptime,
   *       |       ^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 112 |       ...ConnectionUptime,
   *       |       ^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 119 |       ...ConnectionUptime,
   *       |       ^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 127 |       ...ConnectionUptime,
   *       |       ^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | /**
   * > 135 |       ...ConnectionUptime,
   *       |       ^^^^^^^^^^^^^^^^^^^ Unsupported feature: Translating "object types with spreads in the middle or at the end" is currently not supported.
   **/
  any
  | {
      type: "fusebox_shell_preparation_attempt";
      result: DebuggerShellPreparationResult;
    };
/**
 * A simple interface for logging events, to be implemented by integrators of
 * `dev-middleware`.
 *
 * This is an unstable API with no semver guarantees.
 */
export interface EventReporter {
  logEvent(event: ReportableEvent): void;
}
