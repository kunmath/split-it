/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as demo from "../demo.js";
import type * as expenses from "../expenses.js";
import type * as exportsModule from "../exports.js";
import type * as groups from "../groups.js";
import type * as invites from "../invites.js";
import type * as users from "../users.js";

declare const fullApi: ApiFromModules<{
  demo: typeof demo;
  expenses: typeof expenses;
  exports: typeof exportsModule;
  groups: typeof groups;
  invites: typeof invites;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
