const collectMessages = (value: unknown): string[] => {
  if (!value) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectMessages,
    );
  }

  return [];
};

const uniqueMessages = (messages: string[]) => {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key = message.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const safeError = (err?: unknown, fallback = "Something went wrong") => {
  if (typeof err === "string" && err.trim()) return err;

  if (err && typeof err === "object") {
    const candidate = err as {
      message?: unknown;
      response?: {
        data?: {
          message?: unknown;
          error?: unknown;
          errors?: unknown;
          exception?: unknown;
        };
      };
      error?: { message?: unknown };
      data?: {
        message?: unknown;
        error?: unknown;
        errors?: unknown;
        exception?: unknown;
      };
    };

    const data = candidate.response?.data ?? candidate.data;
    const messages = uniqueMessages([
      ...collectMessages(data?.message),
      ...collectMessages(data?.error),
      ...collectMessages(data?.errors),
      ...collectMessages(data?.exception),
      ...collectMessages(candidate.error?.message),
      ...collectMessages(candidate.message),
    ]);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return fallback;
};
