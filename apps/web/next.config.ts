import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
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
};

export default nextConfig;
