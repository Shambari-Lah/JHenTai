import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

// CORS回避用 画像プロキシ
router.get('/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      timeout: 15000
    });

    const contentType = (response.headers['content-type'] as string) || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error('Error fetching image:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch image from URL', 
      details: error.message 
    });
  }
});

// Webページから画像ギャラリーを解析・抽出
router.post('/scrape-gallery', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Page URL is required' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const images: { url: string; alt?: string; title?: string }[] = [];
    const seenUrls = new Set<string>();

    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original');
      if (!src) return;

      try {
        const absoluteUrl = new URL(src, url).toString();
        // 小さなアイコンやトラッキング画像をある程度フィルタ
        if (
          !seenUrls.has(absoluteUrl) &&
          !absoluteUrl.endsWith('.svg') && // 一般的なストーリー画像はraster
          !absoluteUrl.includes('tracking') &&
          !absoluteUrl.includes('pixel') &&
          !absoluteUrl.includes('avatar')
        ) {
          seenUrls.add(absoluteUrl);
          images.push({
            url: absoluteUrl,
            alt: $(el).attr('alt') || '',
            title: $(el).attr('title') || ''
          });
        }
      } catch (e) {
        // invalid url ignored
      }
    });

    // OGP画像も追加
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      try {
        const absOg = new URL(ogImage, url).toString();
        if (!seenUrls.has(absOg)) {
          seenUrls.add(absOg);
          images.unshift({ url: absOg, alt: 'OGP Main Image' });
        }
      } catch (e) {}
    }

    return res.json({
      pageUrl: url,
      pageTitle: $('title').text().trim() || 'Visual Gallery',
      imageCount: images.length,
      images
    });
  } catch (error: any) {
    console.error('Error scraping gallery:', error.message);
    return res.status(500).json({ 
      error: 'Failed to parse webpage for images', 
      details: error.message 
    });
  }
});

export default router;
