import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold">Сторінку не знайдено (404)</h2>
      <p className="mt-2 text-muted-foreground">Не вдалося знайти запитуваний ресурс.</p>
      <Link href="/" className="mt-4 underline">
        Повернутися на головну
      </Link>
    </div>
  );
}
