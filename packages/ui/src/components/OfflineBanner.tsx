export interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-attention px-4 py-2 text-center text-sm font-medium text-text-primary"
    >
      Sem conexão — funcionalidades offline indisponíveis.
    </div>
  );
}
