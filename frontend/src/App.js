import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

const API_URL = 'http://localhost:5000/arbitrage';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'DOGEUSDT', 'SHIBUSDT', 'LINKUSDT', 'TONUSDT'];
const EXCHANGES = ['Binance', 'Coinbase', 'CoinMarketCap', 'CoinGecko', 'CryptoCompare', 'Bitfinex', 'Huobi', 'Gateio', 'Bybit'];
const FETCH_INTERVAL = 60000; // 1 minute

const App = () => {
  const [result, setResult] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [selectedExchanges, setSelectedExchanges] = useState({});
  const [priceHistory, setPriceHistory] = useState([]);

  const fetchArbitrage = useCallback(async () => {
    const selectedExchangeKeys = Object.keys(selectedExchanges).filter((key) => selectedExchanges[key]);
    if (selectedExchangeKeys.length === 0) return; // No exchanges selected

    try {
      const response = await axios.get(`${API_URL}?symbol=${selectedSymbol}`);
      
      // Filter response data based on selected exchanges
      const filteredData = selectedExchangeKeys.reduce((obj, key) => {
        if (response.data[key]) {
          obj[key] = response.data[key];
        }
        return obj;
      }, {});

      setResult(filteredData);
      updatePriceHistory(filteredData, selectedSymbol);
    } catch (error) {
      console.error('Error fetching arbitrage data:', error);
    }
  }, [selectedSymbol, selectedExchanges]);

  const debouncedFetchArbitrage = useCallback(debounce(fetchArbitrage, 300), [fetchArbitrage]);

  useEffect(() => {
    const intervalId = setInterval(debouncedFetchArbitrage, FETCH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [debouncedFetchArbitrage]);

  const updatePriceHistory = (data, symbol) => {
    setPriceHistory((prevHistory) => {
      const newEntry = {
        timestamp: new Date().toLocaleTimeString(),
        symbol,
        ...Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== null) acc[key] = parseFloat(value);
          return acc;
        }, {}),
      };
      return [...prevHistory.slice(-19), newEntry]; // Keep last 20 entries
    });
  };

  const handleExchangeChange = (exchange) => {
    setSelectedExchanges((prev) => ({
      ...prev,
      [exchange]: !prev[exchange],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = EXCHANGES.reduce((acc, exchange) => {
      acc[exchange] = true;
      return acc;
    }, {});
    setSelectedExchanges(allSelected);
  };

  const handleClearAll = () => {
    setSelectedExchanges({});
  };

  return (
    <div className="arbitrage-container">
      <h1 className="title">Crypto Arbitrage Bot</h1>

      <div className="dropdown-container">
        <h3>Select Symbol</h3>
        <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="symbol-select">
          {SYMBOLS.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="exchange-container">
        <h3>Select Exchanges</h3>
        <div className="button-group">
          <button onClick={handleSelectAll} className="select-button">
            Select All
          </button>
          <button onClick={handleClearAll} className="clear-button">
            Clear All
          </button>
        </div>
        <div className="checkbox-group">
          {EXCHANGES.map((exchange) => (
            <label key={exchange} className="exchange-label">
              <input
                type="checkbox"
                checked={!!selectedExchanges[exchange]}
                onChange={() => handleExchangeChange(exchange)}
              />
              {exchange}
            </label>
          ))}
        </div>
      </div>

      <button onClick={debouncedFetchArbitrage} className="fetch-button">
        Fetch Prices
      </button>

      {result && Object.keys(result).length > 0 && (
        <div className="price-card-container">
          <h3 className="section-title">Current Prices</h3>
          <table className="price-table">
            <thead>
              <tr>
                <th>Exchange</th>
                <th>Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result).map(([source, price]) => (
                <tr key={source}>
                  <td>{source}</td>
                  <td>{price !== null ? `$${parseFloat(price).toFixed(2)}` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {priceHistory.length > 0 && (
        <div className="chart-container">
          <h3 className="section-title">Price History</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(priceHistory[0])
                .filter((key) => key !== 'timestamp' && key !== 'symbol')
                .map((key, index) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={`hsl(${index * 60}, 70%, 50%)`} dot={false} />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default App;
