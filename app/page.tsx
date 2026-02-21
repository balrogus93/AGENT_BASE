export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/metrics`, {
    cache: "no-store"
  });

  const data = await res.json();

  return (
    <main style={{ padding: 40 }}>
      <h1>DeFi Auto Agent</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
