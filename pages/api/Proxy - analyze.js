export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '200mb'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const processorUrl = process.env.PROCESSOR_URL;
  if (!processorUrl) {
    return res.status(500).json({ error: 'Processor URL not configured' });
  }

  try {
    // Forward the multipart form data directly to Railway
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const response = await fetch(`${processorUrl}/analyze`, {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': body.length.toString()
      },
      body
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Railway error:', error);
      return res.status(500).json({ error: 'Processor error' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
