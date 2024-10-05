require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const EXCHANGES = {
  BINANCE: 'Binance',
  COINBASE: 'Coinbase',
  COINMARKETCAP: 'CoinMarketCap',
  COINGECKO: 'CoinGecko',
  CRYPTOCOMPARE: 'CryptoCompare',
  BITFINEX: 'Bitfinex',
  HUOBI: 'Huobi'
};

const getPrice = async (exchange, symbol) => {
  try {
    let response;
    switch (exchange) {
      case EXCHANGES.BINANCE:
        response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        return parseFloat(response.data.price);
      case EXCHANGES.COINBASE:
        response = await axios.get(`https://api.coinbase.com/v2/prices/${symbol.replace('USDT', '-USD')}/spot`);
        return parseFloat(response.data.data.amount);
      case EXCHANGES.COINMARKETCAP:
        response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`, {
          headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKET_API_KEY },
          params: { symbol: symbol.replace('USDT', '') }
        });
        return response.data.data[symbol.replace('USDT', '')].quote.USD.price;
      case EXCHANGES.COINGECKO:
        const currency = symbol.slice(0, 3).toLowerCase();
        response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`);
        return response.data[currency]?.usd;
      case EXCHANGES.CRYPTOCOMPARE:
        response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${symbol.slice(0, 3)}&tsyms=USD`);
        return response.data.USD;
      case EXCHANGES.BITFINEX:
        response = await axios.get(`https://api.bitfinex.com/v1/pubticker/${symbol.toLowerCase()}`);
        return parseFloat(response.data.last_price);
      case EXCHANGES.HUOBI:
        response = await axios.get(`https://api.huobi.pro/market/detail/merged?symbol=${symbol.toLowerCase()}`);
        return parseFloat(response.data.tick.close);
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  } catch (error) {
    console.error(`Error fetching ${exchange} price:`, error.response ? error.response.data : error.message);
    return null;
  }
};

app.get('/arbitrage', async (req, res) => {
  const { symbol } = req.query;
  console.log('Received request for symbol:', symbol);

  const prices = await Promise.all(
    Object.values(EXCHANGES).map(async (exchange) => {
      const price = await getPrice(exchange, symbol);
      return { [exchange]: price };
    })
  );

  const result = Object.assign({}, ...prices);
  
  console.log('Prices:', result);

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

