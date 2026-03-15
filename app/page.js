"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closeLabels,
  createTradeRecord,
  emptyCaptureForm,
  emptyExecutionDraft,
  formatDate,
  loadTradeRecords,
  saveTradeRecords,
  tradeStatuses,
} from "../lib/trade-store";

function statClosedWinRate(records) {
  const closed = records.filter((record) =>
    [tradeStatuses.win, tradeStatuses.loss, tradeStatuses.breakeven].includes(record.status),
  );
  const wins = closed.filter((record) => record.status === tradeStatuses.win).length;
  return closed.length ? Math.round((wins / closed.length) * 100) : 0;
}

function createExecutionState(record) {
  return {
    ...emptyExecutionDraft,
    ...record.execution,
  };
}

export default function HomePage() {
  const [records, setRecords] = useState([]);
  const [captureForm, setCaptureForm] = useState(emptyCaptureForm);
  const [expandedId, setExpandedId] = useState("");
  const [executionDrafts, setExecutionDrafts] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRecords(loadTradeRecords());
  }, []);

  useEffect(() => {
    saveTradeRecords(records);
  }, [records]);

  const pendingRecords = useMemo(
    () => records.filter((record) => record.status === tradeStatuses.pending),
    [records],
  );
  const openRecords = useMemo(
    () => records.filter((record) => record.status === tradeStatuses.open),
    [records],
  );
  const closedRecords = useMemo(
    () =>
      records.filter((record) =>
        [tradeStatuses.win, tradeStatuses.loss, tradeStatuses.breakeven].includes(record.status),
      ),
    [records],
  );

  const stats = useMemo(
    () => ({
      pending: pendingRecords.length,
      open: openRecords.length,
      closed: closedRecords.length,
      winRate: statClosedWinRate(records),
    }),
    [closedRecords.length, openRecords.length, pendingRecords.length, records],
  );

  function updateCapture(field, value) {
    setCaptureForm((current) => ({ ...current, [field]: value }));
  }

  function addRecord(event) {
    event.preventDefault();

    if (!captureForm.symbol.trim() || !captureForm.summary.trim()) {
      setMessage("先记币种和摘要就够了，这两项先别空着。");
      return;
    }

    const record = createTradeRecord(captureForm);
    setRecords((current) => [record, ...current]);
    setCaptureForm(emptyCaptureForm);
    setMessage("已加入待执行。等你准备动手时，再补完整执行细节。");
  }

  function toggleExecution(record) {
    setExpandedId((current) => (current === record.id ? "" : record.id));
    setExecutionDrafts((current) => ({
      ...current,
      [record.id]: current[record.id] || createExecutionState(record),
    }));
  }

  function updateExecutionDraft(recordId, field, value) {
    setExecutionDrafts((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] || emptyExecutionDraft),
        [field]: value,
      },
    }));
  }

  function savePendingDetails(recordId) {
    const draft = executionDrafts[recordId];
    if (!draft) {
      return;
    }

    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              updatedAt: Date.now(),
              execution: {
                ...record.execution,
                ...draft,
              },
            }
          : record,
      ),
    );
    setMessage("待执行细节已经保存。");
  }

  function executeTrade(recordId) {
    const draft = executionDrafts[recordId];
    if (!draft?.setup?.trim()) {
      setMessage("执行前先把 setup 填一下，后面复盘会更清楚。");
      return;
    }

    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status: tradeStatuses.open,
              updatedAt: Date.now(),
              executedAt: Date.now(),
              execution: {
                ...record.execution,
                ...draft,
              },
            }
          : record,
      ),
    );
    setExpandedId("");
    setMessage("这笔计划已进入持仓中，关仓时再标记盈利或亏损。");
  }

  function closeTrade(recordId, status) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status,
              updatedAt: Date.now(),
              closedAt: Date.now(),
            }
          : record,
      ),
    );
    setMessage(`已标记为${closeLabels[status]}。`);
  }

  function removeRecord(recordId) {
    setRecords((current) => current.filter((record) => record.id !== recordId));
    if (expandedId === recordId) {
      setExpandedId("");
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Trade Log MVP</p>
          <h1>先轻量记录，再进入执行，最后只在平仓时判断盈亏。</h1>
          <p>
            这个版本先把你的手机记录流程做顺。第一步只记币种和摘要；进入待执行后才补细节；
            一旦开仓，记录就进入持仓中，等平仓时直接点盈利或亏损。
          </p>
        </div>

        <div className="scoreboard">
          <article className="stat-card primary">
            <span>待执行</span>
            <strong>{stats.pending}</strong>
          </article>
          <article className="stat-card">
            <span>持仓中</span>
            <strong>{stats.open}</strong>
          </article>
          <article className="stat-card">
            <span>已平仓</span>
            <strong>{stats.closed}</strong>
          </article>
          <article className="stat-card">
            <span>胜率</span>
            <strong>{stats.winRate}%</strong>
          </article>
        </div>
      </section>

      <section className="quick-strip" aria-label="Quick navigation">
        <a className="quick-link" href="#capture">
          快速记录
        </a>
        <a className="quick-link" href="#pending">
          待执行
        </a>
        <a className="quick-link" href="#open">
          持仓中
        </a>
        <a className="quick-link" href="#closed">
          已平仓
        </a>
      </section>

      {message ? <p className="notice-bar">{message}</p> : null}

      <section className="capture-panel panel" id="capture">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>快速记录</h2>
          </div>
          <p className="panel-note">适合手机上快速记一笔，不让好计划先消失。</p>
        </div>

        <form className="capture-form" onSubmit={addRecord}>
          <label className="field">
            <span>币种</span>
            <input
              value={captureForm.symbol}
              onChange={(event) => updateCapture("symbol", event.target.value)}
              placeholder="例如 BTCUSDT"
            />
          </label>

          <label className="field wide">
            <span>摘要</span>
            <textarea
              value={captureForm.summary}
              onChange={(event) => updateCapture("summary", event.target.value)}
              placeholder="例如 ChatGPT 说等回踩后做 second leg long，不要追突破。"
            />
          </label>

          <button className="primary-button" type="submit">
            加入待执行
          </button>
        </form>
      </section>

      <section className="board-grid">
        <article className="panel" id="pending">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>待执行</h2>
            </div>
            <p className="panel-note">这里再补完整细节，并决定什么时候正式开仓。</p>
          </div>

          <div className="stack-list">
            {pendingRecords.length ? (
              pendingRecords.map((record) => {
                const draft = executionDrafts[record.id] || createExecutionState(record);
                const isExpanded = expandedId === record.id;

                return (
                  <article className="stack-card" key={record.id}>
                    <div className="stack-top">
                      <div>
                        <strong>{record.symbol}</strong>
                        <span>{record.summary}</span>
                      </div>
                      <span className="badge badge-pending">待执行</span>
                    </div>

                    <p className="stack-subtext">记录时间：{formatDate(record.createdAt)}</p>

                    <div className="action-row">
                      <button className="primary-button" onClick={() => toggleExecution(record)} type="button">
                        {isExpanded ? "收起细节" : "填写执行细节"}
                      </button>
                      <button className="ghost-button" onClick={() => removeRecord(record.id)} type="button">
                        删除
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="detail-form">
                        <div className="detail-grid">
                          <label className="field">
                            <span>时间周期</span>
                            <input
                              value={draft.timeframe}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "timeframe", event.target.value)
                              }
                              placeholder="例如 15m / 1h"
                            />
                          </label>

                          <label className="field">
                            <span>方向</span>
                            <select
                              value={draft.direction}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "direction", event.target.value)
                              }
                            >
                              <option>Long</option>
                              <option>Short</option>
                              <option>Wait</option>
                            </select>
                          </label>

                          <label className="field">
                            <span>Setup</span>
                            <input
                              value={draft.setup}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "setup", event.target.value)
                              }
                              placeholder="例如 H2 buy / Bear flag short"
                            />
                          </label>

                          <label className="field">
                            <span>计划入场</span>
                            <input
                              value={draft.plannedEntry}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "plannedEntry", event.target.value)
                              }
                              placeholder="例如 62000-62150"
                            />
                          </label>

                          <label className="field">
                            <span>止损</span>
                            <input
                              value={draft.stopLoss}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "stopLoss", event.target.value)
                              }
                              placeholder="例如 pullback low"
                            />
                          </label>

                          <label className="field">
                            <span>目标</span>
                            <input
                              value={draft.target}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "target", event.target.value)
                              }
                              placeholder="例如 prior high / measured move"
                            />
                          </label>

                          <label className="field">
                            <span>失效条件</span>
                            <input
                              value={draft.invalidation}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "invalidation", event.target.value)
                              }
                              placeholder="例如 strong close below HL"
                            />
                          </label>

                          <label className="field">
                            <span>实际入场</span>
                            <input
                              value={draft.actualEntry}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "actualEntry", event.target.value)
                              }
                              placeholder="执行时填真实价格也可以"
                            />
                          </label>

                          <label className="field">
                            <span>风险计划</span>
                            <input
                              value={draft.riskPlan}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "riskPlan", event.target.value)
                              }
                              placeholder="例如 1R / 0.5%"
                            />
                          </label>

                          <label className="field wide">
                            <span>执行备注</span>
                            <textarea
                              value={draft.note}
                              onChange={(event) =>
                                updateExecutionDraft(record.id, "note", event.target.value)
                              }
                              placeholder="这里补充你真正准备执行前的观察。"
                            />
                          </label>
                        </div>

                        <div className="action-row">
                          <button className="secondary-button" onClick={() => savePendingDetails(record.id)} type="button">
                            保存细节
                          </button>
                          <button className="primary-button" onClick={() => executeTrade(record.id)} type="button">
                            执行开仓
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="empty-block">
                <p>这里放你准备观察的计划。先轻量记录，降低开始使用的门槛。</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel" id="open">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>持仓中</h2>
            </div>
            <p className="panel-note">开仓后只做一件事，等关仓时标记结果。</p>
          </div>

          <div className="stack-list">
            {openRecords.length ? (
              openRecords.map((record) => (
                <article className="stack-card journal-card" key={record.id}>
                  <div className="stack-top">
                    <div>
                      <strong>{record.symbol}</strong>
                      <span>
                        {record.execution.direction || "-"} · {record.execution.timeframe || "未填周期"} ·{" "}
                        {record.execution.setup || "未填 setup"}
                      </span>
                    </div>
                    <span className="badge badge-open">持仓中</span>
                  </div>

                  <dl className="mini-grid">
                    <div>
                      <dt>计划入场</dt>
                      <dd>{record.execution.plannedEntry || "-"}</dd>
                    </div>
                    <div>
                      <dt>实际入场</dt>
                      <dd>{record.execution.actualEntry || "-"}</dd>
                    </div>
                    <div>
                      <dt>止损</dt>
                      <dd>{record.execution.stopLoss || "-"}</dd>
                    </div>
                    <div>
                      <dt>目标</dt>
                      <dd>{record.execution.target || "-"}</dd>
                    </div>
                  </dl>

                  {record.execution.note ? <p className="stack-subtext">{record.execution.note}</p> : null}
                  <p className="stack-subtext">开仓时间：{formatDate(record.executedAt)}</p>

                  <div className="action-row">
                    <button className="secondary-button" onClick={() => closeTrade(record.id, tradeStatuses.win)} type="button">
                      平仓盈利
                    </button>
                    <button className="secondary-button" onClick={() => closeTrade(record.id, tradeStatuses.loss)} type="button">
                      平仓亏损
                    </button>
                    <button className="ghost-button" onClick={() => closeTrade(record.id, tradeStatuses.breakeven)} type="button">
                      平仓保本
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-block">
                <p>真正开仓的记录会来到这里。你不需要重复建单，平仓时直接点结果就行。</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="closed-panel panel" id="closed">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Archive</p>
            <h2>已平仓记录</h2>
          </div>
          <p className="panel-note">这是未来接 Supabase 最容易迁移的一层，单条记录只有状态变化。</p>
        </div>

        <div className="stack-list">
          {closedRecords.length ? (
            closedRecords.map((record) => (
              <article className="stack-card" key={record.id}>
                <div className="stack-top">
                  <div>
                    <strong>{record.symbol}</strong>
                    <span>{record.summary}</span>
                  </div>
                  <span className={`badge badge-${record.status}`}>{closeLabels[record.status]}</span>
                </div>

                <dl className="mini-grid">
                  <div>
                    <dt>Setup</dt>
                    <dd>{record.execution.setup || "-"}</dd>
                  </div>
                  <div>
                    <dt>方向</dt>
                    <dd>{record.execution.direction || "-"}</dd>
                  </div>
                  <div>
                    <dt>开仓时间</dt>
                    <dd>{formatDate(record.executedAt)}</dd>
                  </div>
                  <div>
                    <dt>平仓时间</dt>
                    <dd>{formatDate(record.closedAt)}</dd>
                  </div>
                </dl>

                <button className="ghost-button" onClick={() => removeRecord(record.id)} type="button">
                  删除
                </button>
              </article>
            ))
          ) : (
            <div className="empty-block">
              <p>平仓后的记录会沉淀在这里，后续接数据库后可以继续扩展成统计和月度复盘。</p>
            </div>
          )}
        </div>
      </section>

      <nav className="mobile-dock" aria-label="Mobile shortcuts">
        <a className="dock-primary" href="#capture">
          + 新记录
        </a>
        <a className="dock-link" href="#pending">
          待执行
        </a>
        <a className="dock-link" href="#open">
          持仓
        </a>
      </nav>
    </main>
  );
}
