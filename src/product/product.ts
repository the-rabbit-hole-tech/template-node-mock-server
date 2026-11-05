// Copyright 2026 The template-node-mock-server Authors
// SPDX-License-Identifier: Apache-2.0
// Who this mock is, and everything it serves: the one object src/serve.ts hands the core. A
// product changes these settings, and the files beside this one, when it clones the template;
// src/core never imports anything from this folder.

import { readFileSync } from "node:fs";

import type { Product } from "#core/product.ts";

import { productActions, productSummary } from "#product/controls.ts";
import { seed } from "#product/data.ts";
import { resolvers } from "#product/resolvers.ts";

export const example: Product = {
  actions: productActions,
  resolvers,
  schema: readFileSync(new URL("schema.graphql", import.meta.url), "utf8"),
  seed,
  settings: {
    graphqlPath: "/query",
    name: "Example",
    port: 5180,
    publicFields: ["serverInfo"],
    sessionCookie: "example_session",
    version: "v0.1.0-mock",
    versionHeader: "Example-Version",
  },
  summary: productSummary,
};
