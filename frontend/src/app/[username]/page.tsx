import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

type Params = {
  params: Promise<{ username: string }>;
};

type EventType = {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  slug: string;
};

async function getHostData(username: string) {
  const res = await fetch(`${API_BASE_URL}/api/public/${username}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    user: { name: string; slug: string };
    eventTypes: EventType[];
  };
}

export default async function HostPage({ params }: Params) {
  const { username } = await params;
  const data = await getHostData(username);

  if (!data) {
    return (
      <main className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Host not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto my-8 max-w-4xl px-4 sm:px-6">
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Public Booking
          </p>
          <Link href="/" className="btn-secondary text-sm">
            Home
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{data.user.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Choose an event type to continue.
        </p>

        <div className="mt-6 grid gap-3">
          {data.eventTypes.map((item) => (
            <Link
              key={item.id}
              className="rounded-xl border border-border p-4 transition hover:bg-surface-soft"
              href={`/${username}/${item.slug}`}
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {item.durationMinutes} minutes
              </p>
              {item.description ? (
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
