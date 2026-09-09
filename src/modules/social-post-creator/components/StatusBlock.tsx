import { AlertCircle } from 'lucide-react';

/** Shared loading/error blocks for this module's steps — same visual language as Studio's existing spinner/error-banner conventions (see TemplatesScreen.tsx). */

export function LoadingBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm font-medium text-navy-500">{message}</p>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1.5 font-semibold underline hover:no-underline">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
