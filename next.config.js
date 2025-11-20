/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // scriptsディレクトリをビルドから除外
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // EmotionのSSRサポートを有効化
  compiler: {
    emotion: true,
  },
};

module.exports = nextConfig;
