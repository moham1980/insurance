import { GeminiService } from './gemini/gemini.service';

async function quickTest() {
  console.log('Testing Gemini connectivity with proxy...');
  const gemini = new GeminiService();
  
  try {
    // Simple text test
    const result = await gemini.analyzeDocument('Test document for insurance claim', 'insurance');
    console.log('✅ Gemini text analysis OK:', result.summary.slice(0, 100));
  } catch (err) {
    console.error('❌ Gemini text analysis failed:', err);
  }

  try {
    // Image test with a tiny base64 image (1x1 pixel transparent)
    const tinyImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    const result = await gemini.extractTextFromImage(tinyImage, 'image/png');
    console.log('✅ Gemini image extraction OK:', result.slice(0, 100));
  } catch (err) {
    console.error('❌ Gemini image extraction failed:', err);
  }
}

quickTest().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
