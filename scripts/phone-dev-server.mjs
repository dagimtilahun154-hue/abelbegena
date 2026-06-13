import http from "node:http"
import https from "node:https"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { createServer as createViteServer } from "vite"
import { getCertificate } from "@vitejs/plugin-basic-ssl"

const root = process.cwd()
const host = process.env.HOST || "0.0.0.0"
const port = Number(process.env.PORT || 5174)

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
}

const lanAddresses = getLanAddresses()
const preferredHost = lanAddresses[0] || "localhost"
const cert = await getCertificate(
  path.join(root, "node_modules/.vite/basic-ssl"),
  "Abel Begena Local Dev",
  ["localhost", ...lanAddresses],
  30,
)

const httpsServer = https.createServer({ key: cert, cert })

const vite = await createViteServer({
  configFile: path.join(root, "vite.config.ts"),
  appType: "spa",
  server: {
    middlewareMode: true,
    hmr: {
      protocol: "wss",
      host: preferredHost,
      port,
      server: httpsServer,
    },
  },
})

httpsServer.on("request", vite.middlewares)

const httpRedirectServer = http.createServer((req, res) => {
  const requestedHost = req.headers.host || `${preferredHost}:${port}`
  const target = `https://${requestedHost}${req.url || "/"}`

  res.writeHead(307, {
    Location: target,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  })
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Open Secure Camera Page</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #08090a; color: white; display: grid; min-height: 100vh; place-items: center; }
      main { width: min(520px, calc(100vw - 32px)); text-align: center; }
      a { display: inline-flex; margin-top: 20px; padding: 14px 18px; border-radius: 14px; background: #facc15; color: #111827; font-weight: 800; text-decoration: none; }
      p { color: rgb(255 255 255 / 0.68); line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Open the secure camera page</h1>
      <p>The attendance scanner needs HTTPS before phones and tablets will expose their camera.</p>
      <a href="${target}">Continue to HTTPS</a>
    </main>
  </body>
</html>`)
})

function listenInternal(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject)
      resolve(server.address().port)
    })
  })
}

const httpsPort = await listenInternal(httpsServer)
const httpPort = await listenInternal(httpRedirectServer)

function routeSocket(socket) {
  socket.once("data", (chunk) => {
    const targetPort = chunk[0] === 22 ? httpsPort : httpPort
    const upstream = net.createConnection(targetPort, "127.0.0.1")

    upstream.on("connect", () => {
      upstream.write(chunk)
      socket.pipe(upstream)
      upstream.pipe(socket)
    })

    upstream.on("error", () => {
      socket.destroy()
    })

    socket.on("error", () => {
      upstream.destroy()
    })
  })
}

const server = net.createServer(routeSocket)

server.on("error", async (error) => {
  await vite.close()
  throw error
})

server.listen(port, host, () => {
  console.log(`\n  Abel Begena phone dev server ready`)
  console.log(`  Local:   https://localhost:${port}/`)
  for (const address of lanAddresses) {
    console.log(`  Network: https://${address}:${port}/`)
  }
  console.log(`\n  Attendance: https://${preferredHost}:${port}/testattend`)
  console.log(`  HTTP on this same port redirects to HTTPS instead of closing.\n`)
})

const shutdown = async () => {
  server.close()
  httpRedirectServer.close()
  httpsServer.close()
  await vite.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
