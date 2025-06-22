import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveClassification = mutation({
  args: {
    imageId: v.id("_storage"),
    modelName: v.string(),
    predictions: v.array(v.object({
      className: v.string(),
      probability: v.number(),
    })),
    processingTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("classifications", {
      imageId: args.imageId,
      modelName: args.modelName,
      predictions: args.predictions,
      processingTime: args.processingTime,
    });
  },
});

export const getClassifications = query({
  args: {},
  handler: async (ctx) => {
    const classifications = await ctx.db
      .query("classifications")
      .order("desc")
      .take(20);

    return Promise.all(
      classifications.map(async (classification) => ({
        ...classification,
        imageUrl: await ctx.storage.getUrl(classification.imageId),
      }))
    );
  },
});

export const getAllClassifications = query({
  args: {},
  handler: async (ctx) => {
    const classifications = await ctx.db
      .query("classifications")
      .order("desc")
      .take(50);

    return Promise.all(
      classifications.map(async (classification) => ({
        ...classification,
        imageUrl: await ctx.storage.getUrl(classification.imageId),
      }))
    );
  },
});
