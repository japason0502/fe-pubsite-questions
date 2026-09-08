import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ROOT_IS_TRIAL, ANNOUNCE_ENABLED } from "./src/trialConfig";

// ルート（既存URL）に出す「新URLへ移ってね」のお知らせ先。
// GitHub Secrets の FULL_PATHS（カンマ区切り）の1個目だけを使う。2個目以降（購入者向け）は JS に入れない。
// ROOT_IS_TRIAL=true（10/1以降）と ANNOUNCE_ENABLED=false のときは空にする（JS に何も入らない）。
const announcePath = ROOT_IS_TRIAL || !ANNOUNCE_ENABLED
  ? ""
  : (process.env.FULL_PATHS ?? "").split(",")[0]?.trim().replace(/^\/+|\/+$/g, "") ?? "";

export default defineConfig(() => ({
  plugins: [react()],
  base: "/",
  define: {
    "import.meta.env.VITE_ANNOUNCE_PATH": JSON.stringify(announcePath),
  },
}));
