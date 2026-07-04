import Link from "next/link";

export default function HostEventLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/submit"
      className={`text-xs text-muted/60 hover:text-muted transition-colors ${className}`}
    >
      Hosting an event? →
    </Link>
  );
}
