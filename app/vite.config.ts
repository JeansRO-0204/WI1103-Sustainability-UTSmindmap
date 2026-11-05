import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(__dirname, '..')
const know = path.join(repo, 'knowledge')

function graphPath() {
  const g = path.join(know, 'graph.json')
  return fs.existsSync(g) ? g : path.join(know, 'graph.sample.json')
}

function quizPath() {
  const q = path.join(know, 'quiz', 'quiz.json')
  return fs.existsSync(q) ? q : path.join(know, 'quiz', 'quiz.sample.json')
}

/** Serves knowledge/graph.json (fallback graph.sample.json), chunks.jsonl and ../ppt originals; emits data into dist. */
function knowledgePlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    const url = decodeURIComponent((req.url || '').split('?')[0])
    let file: string | null = null
    if (url === '/data/graph.json') file = graphPath()
    else if (url === '/data/quiz.json') file = quizPath()
    else if (url === '/data/chunks.jsonl') file = path.join(know, 'chunks.jsonl')
    else if (url.startsWith('/ppt/')) {
      const f = path.join(repo, 'ppt', path.basename(url))
      if (fs.existsSync(f)) file = f
    }
    if (!file || !fs.existsSync(file)) return next()
    const ext = path.extname(file)
    res.setHeader('Content-Type', ext === '.json' ? 'application/json' : ext === '.jsonl' ? 'text/plain; charset=utf-8' : 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store')
    fs.createReadStream(file).pipe(res)
  }
  return {
    name: 'knowledge-data',
    configureServer(s) { s.middlewares.use(handler) },
    configurePreviewServer(s) { s.middlewares.use(handler) },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'data/graph.json', source: fs.readFileSync(graphPath()) })
      if (fs.existsSync(quizPath())) this.emitFile({ type: 'asset', fileName: 'data/quiz.json', source: fs.readFileSync(quizPath()) })
      this.emitFile({ type: 'asset', fileName: 'data/chunks.jsonl', source: fs.readFileSync(path.join(know, 'chunks.jsonl')) })
      const pptDir = path.join(repo, 'ppt')
      if (fs.existsSync(pptDir)) for (const f of fs.readdirSync(pptDir)) if (!f.startsWith('.'))
        this.emitFile({ type: 'asset', fileName: 'ppt/' + f, source: fs.readFileSync(path.join(pptDir, f)) })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), knowledgePlugin()],
  server: { port: 5173, fs: { allow: [repo] } },
})
