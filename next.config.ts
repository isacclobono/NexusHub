
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Added to allow images from the local /uploads/ directory if needed
      // For production, you'd replace 'localhost' with your actual domain
      // or configure for cloud storage provider.
      // This is mainly for local development.
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9002', // Assuming your dev server runs on port 9002
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost', // If using https locally with a custom domain
        port: '9002',
        pathname: '/uploads/**',
      }
    ],
  },
  devIndicators: {
    allowedDevOrigins: ['https://6000-firebase-studio-1749918617850.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev'],
  },
};

export default nextConfig;
