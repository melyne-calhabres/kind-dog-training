import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kind-dog-training.fr',
  output: 'static',
  integrations: [],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});
