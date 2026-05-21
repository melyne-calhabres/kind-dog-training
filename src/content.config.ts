import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    date: z.coerce.date(),
    lastModified: z.coerce.date().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }).refine(
    (data) => !data.image || data.imageAlt,
    { message: "imageAlt est obligatoire quand image est défini", path: ["imageAlt"] }
  ),
});

export const collections = { guides };
