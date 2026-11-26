import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 240_000,
  workers: 1,
  webServer: [
    {
      // parte sempre da un database pulito (create_all non aggiorna le tabelle già esistenti)
      command:
        "uv run python -c \"import pathlib; pathlib.Path('e2e.db').unlink(missing_ok=True)\" && uv run uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: true,
      env: { DATABASE_URL: "sqlite:///./e2e.db", DEV_TOOLS: "1", TWITCH_READER: "0" },
    },
    { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
  ],
  use: { baseURL: "http://localhost:3000" },
});
