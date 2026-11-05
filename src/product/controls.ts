// Copyright 2026 The template-node-mock-server Authors
// SPDX-License-Identifier: Apache-2.0
// The product's own buttons on the /_mock page and kinds for POST /_mock/controls, beside the
// core's (reset, fresh, fail-next, expire-session, sign-in). Each changes the shared state the
// way something happening elsewhere would, so every client sees it, and open subscriptions hear it.

import type { ControlBody } from "#core/controls.ts";
import type { ProductAction } from "#core/product.ts";

import { newId } from "#core/http.ts";
import { data, type Item } from "#product/data.ts";
import { announceItem } from "#product/resolvers.ts";

const addItem = (body: ControlBody) => {
  const item: Item = {
    id: newId("item"),
    ownerId: typeof body.ownerId === "string" ? body.ownerId : "person-bob",
    status: "OPEN",
    title:
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "An item from the controls",
    updatedAt: new Date().toISOString(),
  };
  data().items.push(item);
  announceItem(item, "CREATED");
  return { id: item.id };
};

const finishAll = () => {
  for (const item of data().items.filter((item) => item.status === "OPEN")) {
    Object.assign(item, {
      status: "DONE",
      updatedAt: new Date().toISOString(),
    });
    announceItem(item, "UPDATED");
  }
};

export const productActions: ProductAction[] = [
  {
    hint: "Bob adds it; every open client hears it.",
    kind: "add-item",
    label: "Add an item",
    run: addItem,
    section: "Items",
  },
  {
    kind: "finish-items",
    label: "Mark every item done",
    run: finishAll,
    section: "Items",
  },
];

/** The counts the controls page shows under Data. */
export const productSummary = (): Record<string, number> => ({
  doneItems: data().items.filter((item) => item.status === "DONE").length,
  openItems: data().items.filter((item) => item.status === "OPEN").length,
  people: data().people.length,
});
