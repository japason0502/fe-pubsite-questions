/**
 * 有料版（本講座）の専用URLチェック。
 *
 * pages.yml が SITE_PATHS_COURSE_KEY のパスに置く index.html だけ <meta name="fe-edition" content="course"> が入る。
 * その版では、購入時のメールで届いた専用URL（?k=キー）がないと中身を出さない。
 *  - ?k= はlocalStorageに移してURLから消す（画面共有やブックマークでキーが漏れにくいように）
 *  - 起動時に fe-mail の /license/check に {key, client_id} を送る。停止・無効・端末上限なら止める
 *  - 直近24時間にOKなら先に表示して裏で確認。通信できないときは直近7日にOKなら通す
 * 止めるかどうかの判断は Worker 側（返金・受講停止の通知で止まる）。ここは結果を表示するだけ。
 * 緊急時は trialConfig.ts の LICENSE_REQUIRED を false にすれば、このチェックごと外れる。
 */
import React, { useCallback, useEffect, useState } from "react";
import { MAIL_ENDPOINT, LICENSE_REQUIRED } from "./trialConfig";

const KEY_LS = "license-key";
const OK_LS = "license-ok-at";
const CLIENT_ID_KEY = "stats-client-id"; // App.tsx と同じキー（端末IDを共有する）
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CONTACT_URL = "https://forms.gle/wLCGWoSkDGdg1DCs5";
const FRESH_MS = 24 * 3600_000;
const GRACE_MS = 7 * 24 * 3600_000;

function lsGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* noop */ } }
function lsDel(k: string) { try { localStorage.removeItem(k); } catch { /* noop */ } }

function code8() {
  const buf = new Uint32Array(8);
  try { crypto.getRandomValues(buf); } catch { for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 4294967296); }
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}
function getClientId() {
  let id = lsGet(CLIENT_ID_KEY);
  if (!id) { id = code8() + code8(); lsSet(CLIENT_ID_KEY, id); }
  return id;
}

export function needsLicense(): boolean {
  if (!LICENSE_REQUIRED) return false;
  return document.querySelector('meta[name="fe-edition"]')?.getAttribute("content") === "course";
}

/** URLの ?k= を取り出して localStorage に移し、URLからは消す */
function takeKeyFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    const raw = u.searchParams.get("k");
    if (raw === null) return null;
    u.searchParams.delete("k");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    const k = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    return k || null;
  } catch { return null; }
}

type State = "checking" | "ok" | "nokey" | "notfound" | "revoked" | "limit" | "offline";

function initial(): { key: string | null; state: State } {
  const fromUrl = takeKeyFromUrl();
  if (fromUrl && fromUrl !== lsGet(KEY_LS)) { lsSet(KEY_LS, fromUrl); lsDel(OK_LS); }
  const key = fromUrl ?? lsGet(KEY_LS);
  if (!key) return { key: null, state: "nokey" };
  const okAt = Number(lsGet(OK_LS) || 0);
  return { key, state: Date.now() - okAt < FRESH_MS ? "ok" : "checking" };
}

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [{ key, state: first }] = useState(initial);
  const [state, setState] = useState<State>(first);

  const check = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(MAIL_ENDPOINT + "/license/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, client_id: getClientId() })
      });
      const r = await res.json();
      if (r?.ok) { lsSet(OK_LS, String(Date.now())); setState("ok"); return; }
      lsDel(OK_LS);
      setState(r?.reason === "revoked" ? "revoked" : r?.reason === "limit" ? "limit" : "notfound");
    } catch {
      const okAt = Number(lsGet(OK_LS) || 0);
      setState((s) => (s === "ok" || Date.now() - okAt < GRACE_MS ? "ok" : "offline"));
    }
  }, [key]);

  useEffect(() => { void check(); }, [check]);

  if (state === "ok") return <>{children}</>;
  if (state === "checking") return <Card title="確認しています…" />;
  if (state === "offline")
    return (
      <Card title="通信を確認できませんでした">
        <p>インターネットに接続してから､もう一度お試しください｡</p>
        <button style={btn} onClick={() => { setState("checking"); void check(); }}>もう一度試す</button>
      </Card>
    );
  if (state === "revoked")
    return (
      <Card title="このURLは利用できなくなりました">
        <p>受講資格を確認できないため､このURLはご利用いただけません｡</p>
        <p>お心当たりがない場合は､<a href={CONTACT_URL} target="_blank" rel="noreferrer">お問い合わせ</a>ください｡</p>
      </Card>
    );
  if (state === "limit")
    return (
      <Card title="利用できる端末数の上限に達しています">
        <p>この専用URLは3台までの端末でご利用いただけます｡</p>
        <p>端末を買い替えた場合などは､<a href={CONTACT_URL} target="_blank" rel="noreferrer">お問い合わせ</a>ください｡</p>
      </Card>
    );
  return (
    <Card title={state === "notfound" ? "このURLは無効です" : "専用URLから開いてください"}>
      <p>演習サイトは､<b>ご購入時のメールアドレスにお送りした専用URL</b>から開けます｡</p>
      <p>メールが見つからない場合は､ご購入時のメールアドレスを入力してください｡専用URLを再送します｡</p>
      <ResendForm />
    </Card>
  );
}

function ResendForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "done" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase("sending");
    try {
      const res = await fetch(MAIL_ENDPOINT + "/license/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const r = await res.json();
      setPhase(r?.ok ? "done" : "error");
    } catch { setPhase("error"); }
  };
  if (phase === "done")
    return (
      <p style={{ background: "#ecfdf5", padding: "12px 14px", borderRadius: 8 }}>
        ご購入時のメールアドレスであれば､数分以内に専用URLが届きます｡届かない場合は迷惑メールフォルダもご確認のうえ､
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">お問い合わせ</a>ください｡
      </p>
    );
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ご購入時のメールアドレス"
        style={{ flex: "1 1 220px", padding: "10px 12px", fontSize: 16, border: "1px solid #cbd5e1", borderRadius: 8 }} />
      <button style={btn} disabled={phase === "sending"}>{phase === "sending" ? "送信中…" : "専用URLを再送する"}</button>
      {phase === "error" && <p style={{ color: "#b91c1c", width: "100%", margin: 0 }}>送信できませんでした｡時間をおいてお試しください｡</p>}
    </form>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 18px", fontSize: 15, fontWeight: 700, color: "#fff", background: "#1f5fa8",
  border: 0, borderRadius: 8, cursor: "pointer"
};

function Card({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#eef2f7", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", maxWidth: 520, width: "100%", borderRadius: 12, padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,.08)", lineHeight: 1.8, color: "#1c2430", fontSize: 15 }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>基本情報 科目B 演習サイト</div>
        <h1 style={{ fontSize: 20, margin: "0 0 12px", color: "#1f5fa8" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
