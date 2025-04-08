import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure PDF.js worker is properly handled
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Add a rule to emit worker files directly without bundling
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/chunks/[name][ext]',
        },
      });

      // Properly handle PDF.js imports
      config.resolve.alias = {
        ...config.resolve.alias,
        // Point directly to the PDF.js directories
        "pdfjs-dist": require.resolve('pdfjs-dist/build/pdf'),
      };
    }
    
    return config;
  },
  // Explicitly mark the PDF.js worker as an external resource
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
};

export default nextConfig;
