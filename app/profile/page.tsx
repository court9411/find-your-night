import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-4 text-center">
      <span className="text-5xl">👤</span>
      <h1 className="font-display text-4xl tracking-wide">Your Profile</h1>
      <p className="text-muted text-sm max-w-xs">
        Save your favorite spots, track events you&apos;ve been to, and get personalized picks.
        Coming soon.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-2xl bg-accent text-white font-display text-xl tracking-wide px-8 py-3"
      >
        Find My Night
      </Link>
    </main>
  );
}
