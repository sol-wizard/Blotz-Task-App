/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 * @oncall react_native
 */

type Options = Readonly<{ name?: string; defaults?: Object }>;
/**
 * A data persistence layer for storing application settings, modelled after
 * [`electron-store`](https://www.npmjs.com/package/electron-store).
 *
 * Values are saved in a `config.json` file in `app.getPath('userData')`.
 *
 * Compatibility:
 * - Maintains API and file format compatibility with `electron-store@8.2.0`.
 * - Supports the Electron main process only.
 */
declare class SettingsStore {
  path: string;
  constructor(options?: Options);
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
  reset(...keys: Array<string>): void;
  delete(key: string): void;
  clear(): void;
  get store(): { [$$Key$$: string]: unknown };
  set store(value: unknown);
  _deserialize: (value: string) => unknown;
  _serialize: (value: unknown) => string;
  _ensureDirectory(): void;
  _write(value: unknown): void;
}
export default SettingsStore;
