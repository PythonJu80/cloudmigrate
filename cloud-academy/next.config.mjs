/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.tile.openstreetmap.org',
      },
    ],
  },
  // Transpile leaflet for SSR
  transpilePackages: ['react-leaflet', 'leaflet'],
};

export default nextConfig;
