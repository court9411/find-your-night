/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/pride",
        destination: "/events/Pride",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
