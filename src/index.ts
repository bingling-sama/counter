import type { Env } from "./types"
import { sha256, extractTarget, corsHeaders } from "./utils"
import { recordAndGetStats, setOffset, getDomainOverview } from "./db"
import { CLIENT_SCRIPT } from "./client"

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get("origin")
    const cors = corsHeaders(origin)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors })
    }

    if (url.pathname === "/counter.js" || url.pathname === "/busuanzi.pure.mini.js") {
      return new Response(CLIENT_SCRIPT, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      })
    }

    if (url.pathname === "/api/admin/offset" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization")
      if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      }

      try {
        const body = (await request.json()) as {
          domain: string
          path?: string
          offset_pv?: number
          offset_uv?: number
        }

        if (!body.domain) {
          return new Response(JSON.stringify({ error: "Missing domain" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" }
          })
        }

        await setOffset(
          env.DB,
          body.domain.toLowerCase(),
          body.path || null,
          Number(body.offset_pv || 0),
          Number(body.offset_uv || 0)
        )

        return new Response(JSON.stringify({ success: true, updated: body }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      }
    }

    if (url.pathname === "/api/admin/domain" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization")
      if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      }

      const domain = url.searchParams.get("domain")
      if (!domain) {
        return new Response(JSON.stringify({ error: "Missing domain parameter" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      }

      const overview = await getDomainOverview(env.DB, domain.toLowerCase())
      return new Response(JSON.stringify(overview), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const target = extractTarget(request, url)
    if (!target) {
      return new Response(
        JSON.stringify({
          service: "Counter API",
          status: "running",
          version: "1.0.0",
          compatibleWith: "Busuanzi 2.x",
          usage: {
            jsonp: "/?jsonpCallback=callbackName",
            json: "/?domain=example.com&path=/post/1",
            clientScript: "/counter.js"
          }
        }, null, 2),
        {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "application/json; charset=utf-8"
          }
        }
      )
    }

    try {
      const clientIp = request.headers.get("cf-connecting-ip") || "127.0.0.1"
      const userAgent = request.headers.get("user-agent") || ""
      const today = new Date().toISOString().slice(0, 10)
      const visitorHash = await sha256(`${clientIp}-${userAgent}-${today}`)

      const shouldRecord = url.searchParams.get("record") !== "false"

      const stats = await recordAndGetStats(
        env.DB,
        target.domain,
        target.path,
        visitorHash,
        shouldRecord
      )

      const callbackName =
        url.searchParams.get("jsonpCallback") ||
        url.searchParams.get("callback")

      if (callbackName) {
        const safeCallback = callbackName.replace(/[^\w$]/g, "")
        const jsBody = `try{${safeCallback}(${JSON.stringify(stats)});}catch(e){}`

        return new Response(jsBody, {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        })
      }

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      })
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Failed to record count",
          message: err.message
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        }
      )
    }
  }
}
