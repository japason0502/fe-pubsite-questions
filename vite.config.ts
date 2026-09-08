import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ROOT_IS_TRIAL } from "./src/trialConfig";

// ルート（既存URL）に出す「新URLへ移ってね」のお知らせ先。
// GitHub Secrets の FULL_PATHS（カンマ区切り）の1個目だけを使う。2個目以降（購入者向け）は JS に入れない。
// ROOT_IS_TRIAL=true（10/1以降）のときだけ空にする（既存者向けパスが体験版の JS に残らないようにする）。
// ANNOUNCE_ENABLED=false でも埋め込みはする＝?notice=preview で本番URLの見え方を事前確認できる。
// （埋め込むのは1個目＝既存者向け。ルートは今フル版なので、そこに居る人に見えても失うものはない）
const announcePath = ROOT_IS_TRIAL
  ? ""
  : (process.env.FULL_PATHS ?? "").split(",")[0]?.trim().replace(/^\/+|\/+$/g, "") ?? "";

// ビルドログに残す（Actions のログで Secret が届いているか確認できる）
console.log(
  announcePath
    ? `[announce] お知らせの新URL用パスを埋め込みました（${announcePath.length}文字）`
    : ROOT_IS_TRIAL
      ? "[announce] ROOT_IS_TRIAL=true のため埋め込みなし"
      : "[announce] FULL_PATHS が空です。お知らせは出ません（Secret が build step に届いていない可能性）"
);

export default defineConfig(() => ({
  plugins: [react()],
  base: "/",
  define: {
    "import.meta.env.VITE_ANNOUNCE_PATH": JSON.stringify(announcePath),
  },
}));
