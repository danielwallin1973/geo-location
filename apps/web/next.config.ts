import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  // Tillåt att vi importerar från @geo-audio/shared (TS-källkod) i monorepot.
  transpilePackages: ['@geo-audio/shared'],
  sassOptions: {
    includePaths: [path.join(process.cwd(), 'src/styles')],
  },
  experimental: {
    // Säkerställ att workspace-paket plockas upp korrekt.
    externalDir: true,
  },
};

export default config;
