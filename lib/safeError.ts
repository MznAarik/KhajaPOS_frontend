export const safeError = (err?: unknown, fallback = "Something went wrong") => {
  if (typeof err === "string" && err.trim()) return err;

  if (err && typeof err === "object") {
    const candidate = err as {
      message?: unknown;
      response?: { data?: { message?: unknown; error?: unknown } };
      error?: { message?: unknown };
      data?: { message?: unknown; error?: unknown };
    };

    const message =
      candidate.response?.data?.message ??
      candidate.response?.data?.error ??
      candidate.data?.message ??
      candidate.data?.error ??
      candidate.error?.message ??
      candidate.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};
