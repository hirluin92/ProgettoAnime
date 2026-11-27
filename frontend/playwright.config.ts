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
      env: {
        DATABASE_URL: "sqlite:///./e2e.db",
        DEV_TOOLS: "1",
        TWITCH_READER: "0",
        RATE_LIMIT_PER_MIN: "0",
      },
    },
    {
      // in CI si prova il sito compilato come in produzione: il server di sviluppo ricompila le pagine
      // mentre i test girano (Fast Refresh) e a volte ricarica la pagina nel mezzo di un clic
      command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],
  use: { baseURL: "http://localhost:3000" },
});
