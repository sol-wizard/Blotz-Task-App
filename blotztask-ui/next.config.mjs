/** @type {import('next').NextConfig} */

//Disable react strict mode to avoid double rendering in the signalR conenction (this is a temporary fix for the signalR connection, we should find solution for this)
const nextConfig = {
    reactStrictMode: false,
    distDir: process.env.BUILD_DIR || '.next',
    output: 'standalone',
};

export default nextConfig;
