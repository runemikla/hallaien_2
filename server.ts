/*
 * Custom server: Next.js plus the WebSocket endpoint for voice conversations
 * (/api/live). Next.js route handlers cannot accept WebSockets, and the voice
 * model must be reached from the server so audio can go through Vertex AI in
 * the EU with server-side credentials.
 *
 *   Development: npm run dev
 *   Production:  npm run build && npm start
 */
import { createServer } from 'node:http'
import next from 'next'
import { WebSocketServer } from 'ws'
import { handleLiveConnection, isSameOrigin } from '@/lib/live/relay'
import { LIVE_PATH } from '@/lib/live/protocol'

const dev = process.env.NODE_ENV !== 'production'
// Address to listen on. Behind a reverse proxy, set AUTH_URL to the public address.
const listenHost = process.env.HOST || '0.0.0.0'
const hostname = listenHost === '0.0.0.0' ? 'localhost' : listenHost
const port = Number(process.env.PORT || 3000)

async function main() {
    const app = next({ dev, hostname, port })
    await app.prepare()
    const handle = app.getRequestHandler()
    const upgradeNext = app.getUpgradeHandler()

    const server = createServer((req, res) => {
        handle(req, res).catch(error => {
            console.error('Request failed:', error)
            res.statusCode = 500
            res.end()
        })
    })

    const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 })

    server.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url || '', 'http://localhost')
        if (pathname !== LIVE_PATH) {
            // Next.js' own sockets (hot reload in development)
            upgradeNext(req, socket, head)
            return
        }
        if (!isSameOrigin(req)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
            socket.destroy()
            return
        }
        wss.handleUpgrade(req, socket, head, ws => {
            void handleLiveConnection(ws, req)
        })
    })

    server.listen(port, listenHost, () => {
        console.log(`> Hallaien klar på http://${hostname}:${port} (${dev ? 'utvikling' : 'produksjon'})`)
    })
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
