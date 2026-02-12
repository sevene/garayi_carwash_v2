import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  devIndicators: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'izyeuogltezrcrbcakck.supabase.co', // Assuming supabase storage too just in case
      }
    ],
  },

  // PowerSync requires specific webpack configuration for WASM/Workers
  webpack: (config, { isServer }) => {
    // PowerSync uses WASM and Web Workers - configure webpack accordingly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false
      };

      // Enable WASM
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true
      };

      // Handle .wasm files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource'
      });
    }

    return config;
  },

  // Allow WASM files from CDN
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
