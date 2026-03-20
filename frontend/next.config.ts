import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                hostname: 'loremflickr.com',
                protocol: 'https'
            },
            {
                hostname: 'picsum.photos',
                protocol: 'https'
            },
        ]
    }
}

export default nextConfig
