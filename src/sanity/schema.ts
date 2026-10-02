import { defineField, defineType } from "sanity";

/**
 * LostNet content model.
 *
 * Field names here are load-bearing: the GROQ projections in
 * src/lib/data/sanity.ts read exactly these paths, and the deterministic
 * matcher consumes the mapped shapes. Change names in both places.
 */

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "emoji", type: "string" }),
    defineField({ name: "aliases", type: "array", of: [{ type: "string" }] }),
  ],
});

export const lostFoundItem = defineType({
  name: "lostFoundItem",
  title: "Lost / Found Item",
  type: "document",
  fields: [
    defineField({
      name: "kind",
      type: "string",
      options: { list: ["lost", "found"], layout: "radio", direction: "horizontal" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "title", type: "string", validation: (r) => r.required().max(60) }),
    defineField({ name: "description", type: "text", validation: (r) => r.required().max(500) }),
    defineField({ name: "category", type: "reference", to: [{ type: "category" }], validation: (r) => r.required() }),
    defineField({ name: "placeLabel", type: "string", validation: (r) => r.required() }),
    defineField({ name: "location", type: "geopoint", validation: (r) => r.required() }),
    defineField({ name: "occurredAt", type: "datetime", validation: (r) => r.required() }),
    defineField({
      name: "colors",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: ["black", "white", "red", "blue", "green", "grey", "yellow", "brown", "silver", "gold", "orange", "pink"],
        layout: "tags",
      },
    }),
    defineField({
      name: "materials",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: ["leather", "metal", "plastic", "cotton", "wool", "canvas", "glass", "paper"],
        layout: "tags",
      },
    }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "open",
      options: { list: ["open", "matched", "resolved"] },
    }),
    defineField({
      name: "imageUrl",
      title: "Item Photo / Visual Evidence",
      type: "url",
    }),
    defineField({
      name: "secretChallenge",
      title: "Ownership Verification Question",
      type: "string",
      description: "A secret detail only the true owner would know to claim it (e.g. lockscreen wallpaper, sticker on back).",
    }),
    defineField({
      name: "handoverNote",
      title: "Secure Handover Coordination",
      type: "string",
      description: "Instructions on where the item is stored or how to arrange pickup safely.",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "placeLabel", kind: "kind" },
    prepare: ({ title, subtitle, kind }) => ({ title, subtitle: `${kind?.toUpperCase()} · ${subtitle}` }),
  },
});

export const match = defineType({
  name: "match",
  title: "Match",
  type: "document",
  fields: [
    defineField({ name: "itemA", type: "reference", to: [{ type: "lostFoundItem" }], validation: (r) => r.required() }),
    defineField({ name: "itemB", type: "reference", to: [{ type: "lostFoundItem" }], validation: (r) => r.required() }),
    defineField({ name: "score", type: "number" }),
    defineField({ name: "confidence", type: "number", validation: (r) => r.min(0).max(100) }),
    defineField({
      name: "breakdown",
      type: "object",
      fields: [
        { name: "category", type: "number" },
        { name: "geo", type: "number" },
        { name: "time", type: "number" },
        { name: "description", type: "number" },
      ],
    }),
    defineField({ name: "reasons", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "margin", type: "number", title: "Margin over 2nd Candidate" }),
    defineField({ name: "isAmbiguous", type: "boolean", title: "Cluster Ambiguity Flag" }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "proposed",
      options: { list: ["proposed", "pendingReview", "confirmed", "rejected"] },
    }),
    defineField({ name: "proposedBy", type: "string", options: { list: ["system", "ai", "human"] }, initialValue: "system" }),
    defineField({ name: "decidedBy", type: "string" }),
    defineField({ name: "decidedAt", type: "datetime" }),
  ],
  preview: {
    select: { status: "status", confidence: "confidence" },
    prepare: ({ status, confidence }) => ({ title: `${status} · ${confidence ?? "?"}%` }),
  },
});

export const reunion = defineType({
  name: "reunion",
  title: "Reunion",
  type: "document",
  fields: [
    defineField({ name: "match", type: "reference", to: [{ type: "match" }], validation: (r) => r.required() }),
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "story", type: "text" }),
    defineField({ name: "safeHarbor", type: "string", title: "Safe Harbor Pickup Location" }),
    defineField({ name: "claimToken", type: "string", title: "One-Time Claim Token" }),
    defineField({
      name: "custodyState",
      type: "string",
      options: { list: ["deposited", "verified", "released"] },
      initialValue: "released",
    }),
    defineField({ name: "verifiedChallengeProof", type: "string", title: "Resolved Proof Summary" }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "draft",
      options: { list: ["draft", "published"] },
    }),
    defineField({ name: "publishedAt", type: "datetime" }),
  ],
});

export const settings = defineType({
  name: "settings",
  title: "Board Settings",
  type: "document",
  fields: [
    defineField({ name: "geoRadiusKm", type: "number", initialValue: 2 }),
    defineField({ name: "timeWindowHours", type: "number", initialValue: 60 }),
    defineField({ name: "scoreThreshold", type: "number", initialValue: 0.6 }),
    defineField({ name: "categoryMin", type: "number", initialValue: 0.8 }),
  ],
});

export const schemaTypes = [category, lostFoundItem, match, reunion, settings];
