export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-full max-w-sm place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-muted">
          Anything you type is saved on this device. It will sync the moment you&apos;re back online.
        </p>
      </div>
    </main>
  );
}
