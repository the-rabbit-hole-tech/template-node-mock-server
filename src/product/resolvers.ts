// Copyright 2026 The template-node-mock-server Authors
// SPDX-License-Identifier: Apache-2.0
// What the mock answers for each field of the product's schema. Resolvers read and change
// mockState.data, and publish changes so every open subscription, from every client, hears them.
// A product replaces these with resolvers for its own schema; src/core wires them in by name.

import { publish, subscribe } from "#core/events.ts";
import {
  type Context,
  MockError,
  type Resolvers,
  signedIn,
  withRole,
} from "#core/graphql.ts";
import { newId } from "#core/http.ts";
import { settings } from "#core/product.ts";
import { mockState, personById } from "#core/state.ts";
import { data, type Item } from "#product/data.ts";

const ITEM_CHANGED = "item-changed";

interface ItemChange {
  item: Item;
  kind: "CREATED" | "DELETED" | "UPDATED";
}

const itemById = (id: string): Item => {
  const item = data().items.find((candidate) => candidate.id === id);
  if (!item) throw new MockError("NOT_FOUND", "That item doesn't exist.");
  return item;
};

const changed = (change: ItemChange) => {
  publish(ITEM_CHANGED, change);
  return change.item;
};

export const resolvers: Resolvers = {
  Item: {
    owner: (item) => personById((item as Item).ownerId),
  },
  Mutation: {
    createItem: (
      _root,
      given: { input: { title: string } },
      context: Context,
    ) => {
      const person = signedIn(context);
      const title = given.input.title.trim();
      if (!title)
        throw new MockError("BAD_USER_INPUT", "Give the item a title.");
      const item: Item = {
        id: newId("item"),
        ownerId: person.id,
        status: "OPEN",
        title,
        updatedAt: new Date().toISOString(),
      };
      data().items.push(item);
      return changed({ item, kind: "CREATED" });
    },
    deleteItem: (_root, given: { id: string }, context: Context) => {
      withRole(context, "ADMIN");
      const item = itemById(given.id);
      data().items = data().items.filter((kept) => kept.id !== item.id);
      changed({ item, kind: "DELETED" });
      return true;
    },
    setItemStatus: (
      _root,
      given: { id: string; status: Item["status"] },
      context: Context,
    ) => {
      signedIn(context);
      const item = itemById(given.id);
      Object.assign(item, {
        status: given.status,
        updatedAt: new Date().toISOString(),
      });
      return changed({ item, kind: "UPDATED" });
    },
  },
  Query: {
    item: (_root, given: { id: string }, context: Context) => {
      signedIn(context);
      return data().items.find((item) => item.id === given.id) ?? null;
    },
    items: (_root, given: { status?: Item["status"] }, context: Context) => {
      signedIn(context);
      return data().items.filter(
        (item) => !given.status || item.status === given.status,
      );
    },
    people: (_root, _arguments, context: Context) => {
      signedIn(context);
      return data().people.filter((p) => !p.disabled);
    },
    serverInfo: () => ({
      name: settings().name,
      needsSetup: mockState.needsSetup,
      version: settings().version,
    }),
    viewer: (_root, _arguments, context: Context) => signedIn(context),
  },
  Subscription: {
    itemChanged: {
      resolve: (change) => change,
      subscribe: (_root, _arguments, context: Context) => {
        signedIn(context);
        return subscribe<ItemChange>(ITEM_CHANGED);
      },
    },
  },
};

/** Publish an item change from outside a resolver (the product's controls). */
export const announceItem = (item: Item, kind: ItemChange["kind"]): void => {
  publish(ITEM_CHANGED, { item, kind });
};
