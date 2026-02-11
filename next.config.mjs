/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore build errors for faster deployments
    // Set to false when ready for production type checking
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  eslint: {
    // Ignore during builds to speed up deployment
    // Run `npm run lint` locally before deploying
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
