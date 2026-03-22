import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// 注意：文章现在存储在数据库中，不再使用 Content Collections
// 以下配置仅用于兼容旧代码，实际不再使用

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
	schema: z.object({}),
});

export const collections = {
	spec: specCollection,
};
