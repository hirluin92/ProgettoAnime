import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <p className="mt-2">{it.home.titolo}</p>
      <footer className="mt-12 text-sm opacity-70">{it.footer}</footer>
    </main>
  );
}
