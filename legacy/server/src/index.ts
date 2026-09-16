// Node 18 互換性ポリフィル (undici/File)
if (typeof (globalThis as any).File === 'undefined') {
  class NodeFile {}
  (globalThis as any).File = NodeFile;
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import proxyRoutes from './routes/proxy.js';
import translateRoutes from './routes/translate.js';
import visionRoutes from './routes/vision.js';
import visionOcrRoutes from './routes/visionOcr.js';
import pluginRoutes from './routes/plugins.js';
import { SAMPLE_STORIES } from './sampleData.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API ルート
app.use('/api', proxyRoutes);
app.use('/api', translateRoutes);
app.use('/api', visionRoutes);
app.use('/api', visionOcrRoutes);
app.use('/api', pluginRoutes);

// サンプルデータ提供
app.get('/api/samples', (_req, res) => {
  res.json({
    stories: SAMPLE_STORIES
  });
});

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// クライアントのビルド済みファイル配信（プロダクション用）
const clientDist = path.resolve('../client/dist');
app.use(express.static(clientDist));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.json({ message: 'Multilingual Visual Content Translator API Server is running.' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Multilingual Visual Content Translator API running on http://localhost:${PORT}`);
});
