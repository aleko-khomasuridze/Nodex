interface TerminalManualCommandProps {
  sshCommand: string;
}

const TerminalManualCommand = ({ sshCommand }: TerminalManualCommandProps) => (
  <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
    <h2 className="text-lg font-semibold text-white">Manual command</h2>
    <p className="mt-2 text-sm text-slate-300">
      Prefer to launch the connection yourself? Copy and paste the SSH command into any external terminal.
    </p>
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
      <pre className="bg-[#030712] px-4 py-3 font-mono text-sm text-emerald-300">{sshCommand}</pre>
    </div>
  </section>
);

export default TerminalManualCommand;
