/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@collapolio/engine'],
  eslint: { ignoreDuringBuilds: true },
  /*
   * Export estático: la web se sirve desde Firebase Hosting (CDN) y todo el
   * juego vive en el servidor de sockets. `redirects` y `headers` no existen
   * en este modo, así que se configuran en firebase.json.
   */
  output: 'export',
  images: { unoptimized: true },
  webpack(config) {
    // El motor usa imports ESM con extensión `.js` (requisito de Node);
    // webpack debe resolverlos contra los `.ts` del workspace.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};
export default nextConfig;
