import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        bindings: {
          WIKIMEDIA_USER_AGENT: "MalgyeolTest/1.0 (https://example.test/contact)"
        }
      },
      wrangler: {
        configPath: "./wrangler.jsonc"
      }
    })
  ],
  test: {
    include: ["test/worker/**/*.spec.js"]
  }
});
