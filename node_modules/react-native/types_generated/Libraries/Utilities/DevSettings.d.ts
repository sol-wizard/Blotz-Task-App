/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<cd56eca2d7e1cb1fbd6902e04ad9a2f9>>
 *
 * This file was translated from Flow by scripts/js-api/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/DevSettings.js
 */

declare let DevSettings: {
  /**
   * Adds a custom menu item to the developer menu.
   *
   * @param title - The title of the menu item. Is internally used as id and should therefore be unique.
   * @param handler - The callback invoked when pressing the menu item.
   */
  addMenuItem(title: string, handler: () => unknown): void;
  /**
   * Reload the application.
   *
   * @param reason
   */
  reload(reason?: string): void;
  onFastRefresh(): void;
};
/**
 * The DevSettings module exposes methods for customizing settings for developers in development.
 */
declare const $$DevSettings: typeof DevSettings;
declare type $$DevSettings = typeof $$DevSettings;
export default $$DevSettings;
