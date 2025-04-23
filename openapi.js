const OpenAI = require('openai');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: true }));

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: 'sk-3f5d53224a1f418bba7320a069d21541'
});

const port = 3000;

const COINS = [
    { symbol: 'BTCUSD', name: 'Bitcoin' },
    { symbol: 'ETHUSD', name: 'Ethereum' },
    { symbol: 'SOLUSD', name: 'Solana' },
    { symbol: 'XRPUSD', name: 'Ripple' }
];

const TIMEFRAMES = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
];

const TYPE = [
    { value: 'ACCURATE', label: ' Accurate' },
    { value: 'ANY', label: 'Analysis' },
];

app.get('/', (req, res) => {
    res.send(`
        <html>
          <head>
            <title>SGR AI Trading Signals</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .form-group { }
              .btn{ margin-top: 20px}
              .row { display: flex; justify-content: space-between;}
              label { display: block; margin-bottom: 5px; font-weight: bold; }
              select, button { padding: 8px 12px; font-size: 16px; }
              button { background: #4CAF50; color: white; border: none; cursor: pointer; }
              button:hover { background: #45a049; }
              .result { margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
              .signal { color: #2E7D32; font-weight: bold; }
              .no-trade { color: #D32F2F; }
                        .card { background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .price { font-size: 24px; font-weight: bold; color: #27ae60; }
          .metric { margin-bottom: 15px; }
          .metric-title { font-weight: bold; color: #7f8c8d; }
          .levels { display: flex; gap: 20px; margin-top: 20px; }
          .level-card { flex: 1; background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .level-value { font-size: 20px; font-weight: bold; margin: 5px 0; }
          .entry { color: #3498db; }
          .stop-loss { color: #e74c3c; }
          .take-profit { color: #2ecc71; }
          .note { font-style: italic; color: #7f8c8d; margin-top: 20px; }
          .red{ color: #D32F2F; }
            </style>
          </head>
          <body>
            <h1 style="text-align:center;">SGR AI Trading Signals</h1>
            
            <form method="POST" action="/analyze">
            <div class="row">
              <div class="form-group">
                <label for="coin">Select Coin:</label>
                <select id="coin" name="coin" required>
                  ${COINS.map(coin => `<option value="${coin.symbol}">${coin.name} (${coin.symbol})</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label for="timeframe">Select Timeframe:</label>
                <select id="timeframe" name="timeframe" required>
                  ${TIMEFRAMES.map(tf => `<option value="${tf.value}">${tf.label}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="timeframe">Select Signal Type:</label>
                <select id="type" name="type" required>
                  ${TYPE.map(ty => `<option value="${ty.value}">${ty.label}</option>`).join('')}
                </select>
              </div>

              <div class="form-group btn">
                 <button type="submit">Get Trading Signal</button>
               </div>
              </div>
            </form>
            
            <div id="result" class="result" style="display:none;">
              <!-- Results will be inserted here -->
            </div>
            
            <script>
              document.querySelector('form').addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                
                document.getElementById('result').style.display = 'block';
                document.getElementById('result').innerHTML = '<p>Analyzing market data...Please Wait</p>';
                
                try {
                  const response = await fetch('/analyze', {
                    method: 'POST',
                    body: new URLSearchParams(formData)
                  });
                  
                  const result = await response.text();
                  document.getElementById('result').innerHTML = result;
                } catch (error) {
                  document.getElementById('result').innerHTML = '<p class="no-trade">Error fetching data. Please try again.</p>';
                }
              });
            </script>
          </body>
        </html>
    `);
});

app.post('/analyze', async (req, res) => {
    try {
        const { coin, timeframe, type } = req.body;
        const resFromgpt = await callChatGPT(coin, timeframe, type);

        if (!resFromgpt) {
            return res.send('<p class="no-trade">No data available</p>');
        }

        if (type == 'ANY') {

            res.send(`
                <div class="card">
                <h2>Market Analysis</h2>
                <div class="price">Current Price: ${resFromgpt.analysis.current_price}</div>
                
                <div class="metric">
                    <div class="metric-title">Trend</div>
                    <div>${resFromgpt.analysis.trend}</div>
                </div>
                
                <div class="metric">
                    <div class="metric-title">Volatility</div>
                    <div>${resFromgpt.analysis.volatility}</div>
                </div>
                
                <div class="metric">
                    <div class="metric-title">Volume</div>
                    <div>${resFromgpt.analysis.volume}</div>
                </div>
                </div>
                
                <div class="card">
                <h2>Trading Recommendations</h2>
                
                <div class="levels">
                    <div class="level-card">
                    <div class="metric-title">Entry Price</div>
                    <div class="level-value entry">${resFromgpt.recommendations.entry_price} - ${resFromgpt.recommendations.type}</div>
                    </div>
                    
                    <div class="level-card">
                    <div class="metric-title">Stop Loss</div>
                    <div class="level-value stop-loss">${resFromgpt.recommendations.stop_loss.level}</div>
                    <div>${resFromgpt.recommendations.stop_loss.reason}</div>
                    </div>
                </div>
                
                <h3>Take Profit Targets</h3>
                <div class="levels">
                    <div class="level-card">
                    <div class="metric-title">Target 1</div>
                    <div class="level-value take-profit">${resFromgpt.recommendations.take_profit[0].level}</div>
                    <div>${resFromgpt.recommendations.take_profit[0].reason}</div>
                    </div>
                    
                    <div class="level-card">
                    <div class="metric-title">Target 2</div>
                    <div class="level-value take-profit">${resFromgpt.recommendations.take_profit[1].level}</div>
                    <div>${resFromgpt.recommendations.take_profit[1].reason}</div>
                    </div>
                </div>
                </div>
                
                <div class="note">
                ${resFromgpt.notes}
                </div>
            `);

        } else {

            if (!resFromgpt.trade) {
                return res.send(`<p class="no-trade">${resFromgpt.reason}</p>`);
            }

            res.send(`
            <div class="signal">
                <p><strong>Entry:</strong> ${resFromgpt.entry}</p>
                <p><strong>Target:</strong> ${resFromgpt.target}</p>
                <p><strong>Stop Loss:</strong> ${resFromgpt.stoploss}</p>
                <p><small>Analysis for ${coin} (${timeframe} timeframe)</small></p>
            </div>
        `);
        }
    } catch (error) {
        console.error("Analysis error:", error);
        res.send('<p class="no-trade">Error processing request</p>');
    }
});

async function callChatGPT(symbol, timeframe, type, retries = 3, delay = 1000) {
    try {
        let data = await getData(symbol, timeframe);
        if (!data || data.length === 0) {
            return false;
        }

        let completion;

        if (type == "ANY") {

            completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a crypto trading bot. Analyze ${symbol} ${timeframe} data and strictly respond in JSON format:
                        -{"analysis": {"current_price": number,"trend": string,"volatility": string,"volume": string},"recommendations": { "entry_price": number,type:string(LONG/SHORT),"stop_loss": {"level": number,"reason": string},"take_profit": [{"level": number,"reason": string},{"level": number,"reason": string}]},"notes": string}`
                    },
                    {
                        role: "user",
                        content: `Here is the last ${timeframe} of ${symbol} data: ${JSON.stringify(data)} in very short. 
                    Please provide: 
                    1. Recommended entry price
                    2. Stop loss level 
                    3. Take profit targets`
                    }
                ],
                model: "deepseek-chat",
                response_format: { type: "json_object" }
            });

            return JSON.parse(completion.choices[0].message.content);
        } else {

            completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a crypto trading bot. Analyze ${symbol} ${timeframe} data and strictly respond in JSON format:
                    - If a trade is valid: { "trade": true, "entry": number, "stoploss": number, "target": number }
                    - If no trade: { "trade": false, "reason": "Brief explanation" }
                    Base decisions on price action, support/resistance, and trend.`
                    },
                    {
                        role: "user",
                        content: `Latest ${symbol} ${timeframe} candles: ${JSON.stringify(data)}. Should we trade?`
                    }
                ],
                model: "deepseek-chat",
                response_format: { type: "json_object" }
            });
            return JSON.parse(completion.choices[0].message.content);
        }

        return false
    } catch (error) {
        if (error.status === 429 && retries > 0) {
            console.log(`Rate limit hit. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            return callChatGPT(symbol, timeframe, type, retries - 1, delay * 2);
        } else {
            console.error("OpenAI API Error:", error);
            return false;
        }
    }
}

async function getData(symbol, timeframe) {
    try {
        const response = await axios.get(`https://api.india.delta.exchange/v2/history/candles?resolution=${timeframe}&symbol=${symbol}&start=${yesterdayUnixTimestamp()}&end=${nowunixTimestamp()}`);
        let tradeData = response.data.result.reverse();
        return tradeData;
    } catch (error) {
        console.error("Data fetch error:", error);
        return false;
    }
}

function nowunixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

function yesterdayUnixTimestamp() {
    return nowunixTimestamp() - (86400 * 2);
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});