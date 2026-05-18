import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-950">
      <h1 className="text-5xl font-bold tracking-tight text-white">
        3D Explorer
      </h1>
      <p className="text-gray-400 text-lg">
        Interactive tools for 3D viewing and image compositing
      </p>
      <Link
        href="/image-composer"
        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
      >
        Open Image Composer →
      </Link>
    </main>
  );
}
