/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as demo from "../demo.js";
import type * as expenses from "../expenses.js";
import type * as exports from "../exports.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_expenseHelpers from "../lib/expenseHelpers.js";
import type * as lib_inviteEmail from "../lib/inviteEmail.js";
import type * as lib_inviteHelpers from "../lib/inviteHelpers.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as settlements from "../settlements.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demo: typeof demo;
  expenses: typeof expenses;
  exports: typeof exports;
  groups: typeof groups;
  http: typeof http;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/expenseHelpers": typeof lib_expenseHelpers;
  "lib/inviteEmail": typeof lib_inviteEmail;
  "lib/inviteHelpers": typeof lib_inviteHelpers;
  "lib/money": typeof lib_money;
  "lib/permissions": typeof lib_permissions;
  settlements: typeof settlements;
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
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
