// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hbc-izon.fr",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
