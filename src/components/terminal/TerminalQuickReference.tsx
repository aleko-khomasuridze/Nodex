import type { RegisteredDevice } from "../../types/device";

interface TerminalQuickReferenceProps {
  device: RegisteredDevice | null;
}

const TerminalQuickReference = ({ device }: TerminalQuickReferenceProps) => (
  <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
    <h3 className="text-base font-semibold text-white">Quick reference</h3>
    <dl className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">IP Address</dt>
        <dd className="text-sm font-medium text-slate-100">
          {device?.ip ?? "Add a device to populate"}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Username</dt>
        <dd className="text-sm font-medium text-slate-100">
          {device?.username ?? "Update the device to set a username"}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">SSH Port</dt>
        <dd className="text-sm font-medium text-slate-100">{device?.port ?? 22}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Password</dt>
        <dd className="text-sm font-medium text-slate-100">
          {device?.password ? "Stored securely" : "Not stored"}
        </dd>
      </div>
    </dl>
    <p className="mt-4 text-xs text-slate-400">
      Tip: If your SSH server uses private key authentication, include the
      <code className="rounded bg-slate-800 px-1">-i /path/to/private-key</code> flag when running the command.
    </p>
  </section>
);

export default TerminalQuickReference;
