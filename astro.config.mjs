import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mondomaine.fr',
  output: 'static',
  integrations: [],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});
