import http from 'http';
import CreditCard from './models/CreditCard.js';

export const startServer = () => {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/credit-cards') {
      try {
        const cards = await CreditCard.find({});
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(cards));
      } catch (err) {
        console.error('Error fetching credit cards:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch credit cards' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
};
