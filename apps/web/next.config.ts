import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';

// Automatically ensure root and workspace environment variables are populated
const rootEnvCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), 'apps/web/.env.local'),
  path.resolve(process.cwd(), 'apps/web/.env'),
];

for (const envPath of rootEnvCandidates) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          let val = trimmed.substring(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {}
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fnemsvwejymnqpufumhj.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hub.jaago.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: [
    '@jaago/auth',
    '@jaago/authz',
    '@jaago/config',
    '@jaago/contracts',
    '@jaago/core-domain',
    '@jaago/core-application',
    '@jaago/core-infra',
    '@jaago/importexport',
    '@jaago/logger',
    '@jaago/mod-announcements',
    '@jaago/mod-directory',
    '@jaago/module-system',
    '@jaago/notifications',
    '@jaago/observability',
    '@jaago/reporting',
    '@jaago/search',
    '@jaago/storage',
    '@jaago/ui',
    '@jaago/workflow',
  ],
  serverExternalPackages: ['nodemailer', '@supabase/supabase-js'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        'node:crypto': false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;

