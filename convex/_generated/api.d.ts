/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as githubWebhookIngest from "../githubWebhookIngest.js";
import type * as identityMapping from "../identityMapping.js";
import type * as lib_githubWebhookPayloads from "../lib/githubWebhookPayloads.js";
import type * as lib_identityMapping from "../lib/identityMapping.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  githubWebhookIngest: typeof githubWebhookIngest;
  identityMapping: typeof identityMapping;
  "lib/githubWebhookPayloads": typeof lib_githubWebhookPayloads;
  "lib/identityMapping": typeof lib_identityMapping;
  "lib/scoring": typeof lib_scoring;
  viewer: typeof viewer;
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
