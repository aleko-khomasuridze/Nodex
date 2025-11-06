import { useState } from "react";

const SettingsPage = () => {
  const [preferences, setPreferences] = useState({
    enableNotifications: true,
    autoStartTerminal: true,
    shareTelemetry: false,
  });

  const togglePreference = (key: keyof typeof preferences) => () => {
    setPreferences((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  return (
    <main className="flex-1 min-h-screen overflow-y-scroll bg-slate-950 py-[4em] px-4">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        <header className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400/80">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Customize your Nodex experience</h1>
          <p className="mt-2 text-sm text-slate-300">
            Adjust how the application behaves on your machine. These preferences are stored locally and can be changed at any time.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <p className="mt-2 text-sm text-slate-300">
              Receive in-app alerts when scans finish or remote sessions disconnect unexpectedly.
            </p>
            <button
              type="button"
              onClick={togglePreference("enableNotifications")}
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 ${
                preferences.enableNotifications
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500/40"
                  : "border border-slate-700 text-slate-200 hover:border-emerald-500"
              }`}
            >
              {preferences.enableNotifications ? "Notifications enabled" : "Enable notifications"}
            </button>
          </article>

          <article className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Terminal behavior</h2>
            <p className="mt-2 text-sm text-slate-300">
              Automatically launch the embedded terminal in your default workspace when you open the app.
            </p>
            <button
              type="button"
              onClick={togglePreference("autoStartTerminal")}
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 ${
                preferences.autoStartTerminal
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500/40"
                  : "border border-slate-700 text-slate-200 hover:border-emerald-500"
              }`}
            >
              {preferences.autoStartTerminal ? "Auto-start enabled" : "Enable auto-start"}
            </button>
          </article>

          <article className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-inner md:col-span-2">
            <h2 className="text-lg font-semibold text-white">Privacy</h2>
            <p className="mt-2 text-sm text-slate-300">
              Share anonymous usage metrics to help us improve Nodex. No credentials or shell history are ever collected.
            </p>
            <button
              type="button"
              onClick={togglePreference("shareTelemetry")}
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 ${
                preferences.shareTelemetry
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500/40"
                  : "border border-slate-700 text-slate-200 hover:border-emerald-500"
              }`}
            >
              {preferences.shareTelemetry ? "Sharing enabled" : "Enable anonymous telemetry"}
            </button>
          </article>
        </div>
      </section>
    </main>
  );
};

export default SettingsPage;
