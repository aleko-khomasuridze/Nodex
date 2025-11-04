interface TerminalHeaderProps {
  title: string;
  subtitle: string;
  onNavigateBack: () => void;
}

const TerminalHeader = ({ title, subtitle, onNavigateBack }: TerminalHeaderProps) => (
  <>
    <header className="flex flex-col gap-2 text-center md:text-left">
      <p className="text-sm uppercase tracking-[0.45em] text-emerald-400/80">
        Terminal
      </p>
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </header>

    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
        onClick={onNavigateBack}
      >
        Back to registered devices
      </button>
    </div>
  </>
);

export default TerminalHeader;
