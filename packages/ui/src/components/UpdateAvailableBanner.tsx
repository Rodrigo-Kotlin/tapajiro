export interface UpdateAvailableBannerProps {
  isVisible: boolean;
  isUpdating?: boolean;
  onUpdate: () => void;
}

export function UpdateAvailableBanner({
  isVisible,
  isUpdating = false,
  onUpdate,
}: UpdateAvailableBannerProps) {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-50 bg-action-primary px-4 py-2 text-center text-sm text-white"
    >
      <span className="mr-4">Nova versão disponível</span>
      <button
        onClick={onUpdate}
        disabled={isUpdating}
        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        Atualizar agora
      </button>
    </div>
  );
}
