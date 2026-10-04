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
      title: "Ownership Challenge — Question",
      type: "string",
      description: "A question only the true owner can answer (e.g. \"What is engraved on the keyring?\"). Asked aloud by the desk.",
    }),
    defineField({
      name: "secretSalt",
      title: "Ownership Challenge — Salt (server generated)",
      type: "string",
      readOnly: true,
      hidden: true,
      description: "Random per-item salt. Written by the server. Never shown to anyone.",
    }),
    defineField({
      name: "secretAnswerHash",
      title: "Ownership Challenge — Answer hash (server generated)",
      type: "string",
      readOnly: true,
      hidden: true,
      description: "PBKDF2-SHA256 of the owner's answer. The plaintext answer is never stored.",
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
    defineField({ name: "safeHarbor", type: "string", title: "Handover place (display label)" }),
    defineField({
      name: "handover",
      title: "Handover plan",
      type: "object",
      fields: [
        {
          name: "mode",
          title: "Mode",
          type: "string",
          options: { list: ["public", "map", "finder"], layout: "radio" },
        },
        { name: "label", title: "Place name", type: "string" },
        { name: "point", title: "Exact point", type: "geopoint" },
        { name: "time", title: "Rough time", type: "string" },
      ],
    }),
    defineField({ name: "claimToken", type: "string", title: "One-Time Claim Token" }),
    defineField({
      name: "custodyState",
      type: "string",
      title: "Custody state (unset = still with the finder)",
      options: { list: ["deposited", "verified", "released"] },
    }),
    defineField({
      name: "challengeQuestion",
      title: "Ownership question (snapshot)",
      type: "string",
      description: "Read aloud by the desk. Revealed only to whoever presents the claim token.",
    }),
    defineField({
      name: "claimAttempts",
      title: "Failed claim attempts",
      type: "number",
      initialValue: 0,
      readOnly: true,
    }),
    defineField({ name: "verifiedAt", type: "datetime", title: "Challenge verified at", readOnly: true }),
    defineField({
      name: "messages",
      title: "Handover Chat Messages",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "id", type: "string" },
            { name: "sender", type: "string" },
            { name: "text", type: "string" },
            { name: "timestamp", type: "string" },
          ],
        },
      ],
    }),
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
