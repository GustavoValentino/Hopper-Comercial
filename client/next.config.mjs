/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // 📦 MANTIDO: Permite carregar a logo atual e imagens antigas do S3
      {
        protocol: "https",
        hostname: "s3-inventorymanagement.s3.us-east-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      // 🚀 ADICIONADO: Permite carregar as novas fotos de perfil e mídias do Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      // 🌐 ADICIONADO: Permite carregar as fotos de perfil dos usuários que logam via Google
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // 🔄 MANTIDO: Proxy para redirecionar as chamadas do Better Auth para o Server (3001)
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3001/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
