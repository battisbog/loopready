import Link from "next/link";

export default function StartButton() {
  return (
    <Link
      href="/start"
      className="inline-block rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
    >
      Start an interview
    </Link>
  );
}
