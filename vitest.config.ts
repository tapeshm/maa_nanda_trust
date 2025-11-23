import path from "node:path";
import dotenv from "dotenv";
process.env.HOME ??= path.join(__dirname, ".home");
process.env.USERPROFILE ??= process.env.HOME;
process.env.WRANGLER_CONFIG_DIR ??= path.join(__dirname, ".wrangler");
process.env.VPW_LOG_LEVEL ??= "debug";
process.env.VITE_CACHE_DIR ??= path.join(__dirname, ".vite-cache");
process.env.VITEST_CACHE_DIR ??= path.join(__dirname, ".vitest-cache");

const { defineWorkersConfig, readD1Migrations } = await import("@cloudflare/vitest-pool-workers/config");

export default defineWorkersConfig(async () => {
  // Load local env for tests that integrate with Supabase
  dotenv.config({ path: ".dev.vars" });
  const migrationsDir = path.join(__dirname, "migrations");
  let migrations = [] as Awaited<ReturnType<typeof readD1Migrations>>;
  const allMigrations = await readD1Migrations(migrationsDir);
  // Only apply the specific migration for landing_content to avoid conflicts with existing tables in the test environment
  // This is a temporary measure to get the landing page tests running given the D1 migration error.
  migrations = allMigrations.filter(m => m.name === '0012_landing_content.sql' || m.name === '0013_about_content.sql' || m.name === '0015_transparency_content.sql' || m.name === '0016_donate_content.sql');

  return {
    cacheDir: path.join(__dirname, ".vite-cache"),
    test: {
      setupFiles: ["./tests/setup/apply-migrations.ts"],
      reporters: [
        ["json", { outputFile: "tmp/vitest-report.json" }],
        "default",
      ],
      poolOptions: {
        workers: {
          // Use the real app wrangler config so tests exercise real bindings.
          experimental_remoteBindings: false,
          wrangler: { configPath: "./wrangler.jsonc" },
          // Provide migrations to the Worker isolate via a test-only binding.
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              // Pass through Supabase bindings for integration tests
              SUPABASE_URL: process.env.SUPABASE_URL,
              SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
              JWKS_URL: process.env.JWKS_URL,
              SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
              ADMIN_USERS: process.env.ADMIN_USERS,
              DEBUG_AUTH: process.env.DEBUG_AUTH ?? "0",
              // Hosted Supabase (optional, for JWKS integration test)
              SUPABASE_HOSTED_URL: process.env.SUPABASE_HOSTED_URL,
              SUPABASE_HOSTED_ANON_KEY: process.env.SUPABASE_HOSTED_ANON_KEY,
              SUPABASE_HOSTED_EMAIL: process.env.SUPABASE_HOSTED_EMAIL,
              SUPABASE_HOSTED_PASSWORD: process.env.SUPABASE_HOSTED_PASSWORD,
            },
          }
        },
      },
      // Inline deps that ship mixed module formats so Vite transforms them
      // for the Workers runtime.
      deps: {
        optimizer: {
          ssr: {
            enabled: true,
            include: ["@supabase/supabase-js"], // ask vite to bundle the dependency rather than loading it in runtime
          },
        },
      },
      server: {
        deps: {
          inline: [
            "@supabase/postgrest-js",
            "@supabase/supabase-js",
            "@supabase/ssr",
            "@supabase/gotrue-js",
            "@supabase/functions-js",
            "@supabase/realtime-js",
            "@supabase/storage-js",
          ],
        },
      },
    },
  };
});
