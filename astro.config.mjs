import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://kind-dog-training.fr',
  output: 'static',
  integrations: [],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  experimental: {
    // Polices auto-hébergées : téléchargées et sous-ensemblées (latin) au build,
    // servies en woff2 same-origin → plus de requête vers fonts.gstatic.com.
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Newsreader',
        cssVariable: '--font-newsreader',
        weights: [400, 500, 600, 700],
        styles: ['normal', 'italic'],
        subsets: ['latin'],
        display: 'swap',
        fallbacks: ['Iowan Old Style', 'Georgia', 'serif'],
      },
      {
        provider: fontProviders.google(),
        name: 'Nunito',
        cssVariable: '--font-nunito',
        weights: [400, 500, 600, 700],
        styles: ['normal'],
        subsets: ['latin'],
        display: 'swap',
        fallbacks: ['SF Pro Rounded', 'system-ui', 'sans-serif'],
      },
    ],
  },
});
