export const storageKey = "trade-discipline-board-v2";

export const tradeStatuses = {
  pending: "pending",
  open: "open",
  win: "win",
  loss: "loss",
  breakeven: "breakeven",
};

export const closeLabels = {
  [tradeStatuses.win]: "盈利",
  [tradeStatuses.loss]: "亏损",
  [tradeStatuses.breakeven]: "保本",
};

export const emptyCaptureForm = {
  symbol: "",
  summary: "",
};

export const emptyExecutionDraft = {
  timeframe: "",
  direction: "Long",
  setup: "",
  plannedEntry: "",
  stopLoss: "",
  target: "",
  invalidation: "",
  note: "",
  actualEntry: "",
  riskPlan: "",
};

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTradeRecord(form) {
  return {
    id: createId(),
    symbol: form.symbol.trim(),
    summary: form.summary.trim(),
    status: tradeStatuses.pending,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executedAt: null,
    closedAt: null,
    execution: {
      ...emptyExecutionDraft,
    },
  };
}

export function loadTradeRecords() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

export function saveTradeRecords(records) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      version: 2,
      records,
    }),
  );
}

export function formatDate(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
