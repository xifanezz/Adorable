"use client";
import { createApp } from "@/actions/create-app";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Adorable App</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors"
        onClick={async () => {
          createApp().then((app) => {
            window.location.href = `/app/${app.id}`;
          });
        }}
      >
        Create App
      </button>
    </main>
  );
}
