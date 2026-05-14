import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable streaming metadata. Without this, Next 16 may insert
  // <div hidden> placeholders for metadata that get streamed after
  // the initial shell, which on dev/HMR can collide with whitespace
  // and trigger "Hydration failed" + DOM removeChild errors.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
