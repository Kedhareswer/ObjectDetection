import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  classifications: defineTable({
    imageId: v.id("_storage"),
    modelName: v.string(),
    predictions: v.array(v.object({
      className: v.string(),
      probability: v.number(),
    })),
    processingTime: v.number(),
  }),
};

export default defineSchema({
  ...applicationTables,
});
