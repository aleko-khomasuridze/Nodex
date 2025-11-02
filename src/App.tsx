function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <header className="text-center">
        <h1 className="text-4xl font-bold">Welcome to Nodex</h1>
        <p className="mt-2 max-w-xl text-balance text-lg text-slate-300">
          This Electron application is powered by React, TypeScript, Tailwind CSS, and Vite. Start building your
          desktop experience by editing <code className="rounded bg-slate-800 px-1 py-0.5">src/App.tsx</code>.
        </p>
      </header>

      <section className="grid max-w-3xl gap-4 rounded-xl bg-slate-900/60 p-6 shadow-lg ring-1 ring-slate-800 backdrop-blur">
        <h2 className="text-2xl font-semibold">Next steps</h2>
        <ul className="list-inside list-disc space-y-2 text-left text-slate-300">
          <li>Update the UI by modifying the React components in <code>src</code>.</li>
          <li>Add secure bridges between the renderer and main processes via the preload script.</li>
          <li>Use Tailwind utility classes to iterate quickly on styling.</li>
        </ul>
      </section>

      <footer className="text-sm text-slate-500">
        Happy coding! 🚀
      </footer>
    </div>
  );
}

export default App;
