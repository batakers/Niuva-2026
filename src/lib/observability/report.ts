import {
  toAppError,
  type AppError,
} from "@/modules/shared/errors";

import { classifyUnknownError } from "./classify";
import {
  createConsoleFailureLogger,
  type FailureLogger,
  type SafeContext,
} from "./logger";

/**
 * Pembungkus `toAppError` untuk pemanggil di luar `apiError()` (Server Action,
 * page, service). `toAppError` sengaja tetap murni dan tidak mengimpor modul
 * observability: `classify.ts` dan `logger.ts` sudah mengimpor dari `errors.ts`,
 * sehingga pencatatan di dalam `errors.ts` akan membuat import melingkar.
 * `apiError()` tetap memakai `toAppError` dan mencatat sendiri, jadi satu
 * kegagalan API menghasilkan tepat satu catatan.
 */
export type ReportUnknownErrorOptions = {
  /** Nama boundary pendek, mis. "action:admin". */
  boundary: string;
  correlationId?: string;
  /** Mengganti logger aktif hanya untuk panggilan ini (dipakai test). */
  logger?: FailureLogger;
  /** Hanya id/enum pendek; lihat `sanitizeSafeContext`. */
  safeContext?: SafeContext;
};

let activeReportLogger: FailureLogger = createConsoleFailureLogger();

/** Mengganti logger untuk modul ini. Pasangkan dengan `resetReportFailureLogger`. */
export function setReportFailureLogger(logger: FailureLogger): void {
  activeReportLogger = logger;
}

export function resetReportFailureLogger(): void {
  activeReportLogger = createConsoleFailureLogger();
}

/**
 * Sama dengan `toAppError`, tetapi mencatat tepat satu kejadian bila `error`
 * bukan `AppError`. `AppError` dikembalikan apa adanya tanpa pencatatan.
 * Tidak pernah melempar karena pencatatan.
 */
export function toAppErrorLogged(
  error: unknown,
  options: ReportUnknownErrorOptions,
): AppError {
  const app = toAppError(error);
  if (app === error) return app;

  try {
    (options.logger ?? activeReportLogger).record({
      boundary: options.boundary,
      correlationId: options.correlationId ?? crypto.randomUUID(),
      errorCode: app.code,
      kind: classifyUnknownError(error),
      occurredAt: new Date(),
      ...(options.safeContext === undefined
        ? {}
        : { safeContext: options.safeContext }),
    });
  } catch {
    // Mencatat log tidak boleh mengubah hasil ke pengguna.
  }

  return app;
}
