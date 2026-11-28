/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  async rewrites(){
        return [
      {
        source: '/wp-content/uploads/:path*',
        destination:
          'https://admin.priyankaracarsale.lk/wp-content/uploads/:path*',
      },
    ];
  }
};

export default nextConfig;
