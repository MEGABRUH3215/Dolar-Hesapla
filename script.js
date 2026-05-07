const API_BASE = 'https://fxapi.app/api';

const currencies = [
    { code: 'USD', name: 'Amerikan Doları', flag: '🇺🇸', color: '#6c5ce7' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺', color: '#0ea5e9' },
    { code: 'GBP', name: 'İngiliz Sterlini', flag: '🇬🇧', color: '#fd79a8' },
    { code: 'JPY', name: 'Japon Yeni', flag: '🇯🇵', color: '#e17055' },
    { code: 'CHF', name: 'İsviçre Frangı', flag: '🇨🇭', color: '#00cec9' },
    { code: 'CAD', name: 'Kanada Doları', flag: '🇨🇦', color: '#fdcb6e' },
    { code: 'AUD', name: 'Avustralya Doları', flag: '🇦🇺', color: '#55efc4' },
    { code: 'TRY', name: 'Türk Lirası', flag: '🇹🇷', color: '#e74c3c' },
    { code: 'RUB', name: 'Rus Rublesi', flag: '🇷🇺', color: '#ff7675' },
    { code: 'INR', name: 'Hindistan Rupisi', flag: '🇮🇳', color: '#a29bfe' }
];

let chart = null;
let currentRates = {};
let previousRates = {};
let historicalData = {};
let displayBase = 'EUR';
let pollInterval = null;
let updating = false;

const sourceCurrency = document.getElementById('source-currency');
const targetCurrency = document.getElementById('target-currency');
const sourceAmount = document.getElementById('source-amount');
const targetAmount = document.getElementById('target-amount');
const resultText = document.getElementById('result-text');
const swapBtn = document.getElementById('swap-btn');
const lastUpdateEl = document.getElementById('last-update');
const currencyCardsContainer = document.getElementById('currency-cards');
const refreshBtn = document.getElementById('refresh-btn');
const countdownText = document.getElementById('countdown-text');
const baseBtns = document.querySelectorAll('.base-btn');

function populateDropdowns() {
    const opts = currencies.map(c =>
        `<option value="${c.code}">${c.code} — ${c.name}</option>`
    ).join('');
    sourceCurrency.innerHTML = opts;
    targetCurrency.innerHTML = opts;
    sourceCurrency.value = 'USD';
    targetCurrency.value = 'TRY';
}

async function fetchLatestRates() {
    if (updating) return;
    updating = true;
    try {
        const response = await fetch(`${API_BASE}/EUR.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.rates && Object.keys(data.rates).length > 1) {
            previousRates = { ...currentRates };
            currentRates = { ...data.rates, EUR: 1 };
            updateUI(data.timestamp);
        }
    } catch (error) {
        console.error('Kur verileri alınamadı:', error);
    } finally {
        updating = false;
    }
}

function getSelectedPeriod() {
    const active = document.querySelector('.period-btn.active');
    return active ? parseInt(active.dataset.period) : 7;
}

async function fetchHistoricalData(days = 7) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const results = await Promise.allSettled(
            ['USD', 'GBP', 'TRY'].map(pair =>
                fetch(`${API_BASE}/history/EUR/${pair}.json?from=${startStr}&to=${endStr}`)
                    .then(r => r.json())
                    .then(d => ({ pair, rates: d.rates || [] }))
            )
        );

        historicalData = {};
        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            const { pair, rates } = result.value;
            for (const entry of rates) {
                if (!historicalData[entry.date]) historicalData[entry.date] = {};
                historicalData[entry.date][pair] = entry.rate;
            }
        }
        renderChart(historicalData, days);
    } catch (error) {
        console.error('Geçmiş veri alınamadı:', error);
    }
}

function updateUI(timestamp) {
    if (timestamp) {
        const d = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) {
            lastUpdateEl.textContent = `${diff} saniye önce`;
        } else if (diff < 3600) {
            lastUpdateEl.textContent = `${Math.floor(diff / 60)} dakika önce`;
        } else {
            lastUpdateEl.textContent = d.toLocaleTimeString('tr-TR');
        }
    }
    const changed = Object.keys(previousRates).length > 0;
    renderCurrencyCards();
    convert();
    if (changed) {
        showToast('Kurlar güncellendi');
        const status = document.querySelector('.status-dot');
        if (status) {
            status.style.animation = 'none';
            status.style.background = '#a29bfe';
            status.style.boxShadow = '0 0 20px #a29bfe';
            setTimeout(() => {
                status.style.animation = '';
                status.style.background = '';
                status.style.boxShadow = '';
            }, 400);
        }
        countdownText.textContent = '✓';
        countdownText.style.color = '#00e676';
        countdownText.style.fontWeight = '700';
        setTimeout(() => {
            countdownText.style.color = '';
            countdownText.style.fontWeight = '';
        }, 800);
    }
}

function getConvertedRate(code, targetBase) {
    const rateInEur = currentRates[code];
    const baseInEur = currentRates[targetBase];
    if (!rateInEur || !baseInEur || baseInEur === 0) return null;
    return rateInEur / baseInEur;
}

function renderCurrencyCards() {
    currencyCardsContainer.innerHTML = '';

    const filtered = currencies.filter(c => c.code !== displayBase);

    filtered.forEach((currency, index) => {
        const rate = getConvertedRate(currency.code, displayBase);
        if (rate === null) return;

        const prevRate = previousRates[currency.code]
            ? getConvertedRate(currency.code, displayBase)
            : null;

        let changeDisplay = null;
        let isPositive = true;

        if (prevRate !== null && prevRate !== rate && prevRate !== 0) {
            const changePercent = ((rate - prevRate) / prevRate) * 100;
            if (Math.abs(changePercent) > 0.0001) {
                isPositive = changePercent >= 0;
                changeDisplay = `${isPositive ? '+' : ''}${changePercent.toFixed(4)}%`;
            }
        }

        const card = document.createElement('div');
        card.className = 'currency-card';
        card.style.animationDelay = `${0.05 * index}s`;
        card.innerHTML = `
            <div class="currency-card-header">
                <span class="currency-code">${currency.code}</span>
                <span class="currency-flag">${currency.flag}</span>
            </div>
            <div class="currency-name">${currency.name}</div>
            <div class="currency-value">${rate.toFixed(4)}</div>
            ${changeDisplay ? `
                <div class="currency-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '↑' : '↓'} ${changeDisplay}
                </div>
            ` : ''}
        `;

        card.addEventListener('click', () => {
            if (currency.code === targetCurrency.value) {
                const temp = sourceCurrency.value;
                sourceCurrency.value = targetCurrency.value;
                targetCurrency.value = temp;
            } else {
                sourceCurrency.value = currency.code;
            }
            convert();
        });

        currencyCardsContainer.appendChild(card);
    });

    if (Object.keys(previousRates).length > 0) {
        document.querySelectorAll('.currency-card').forEach(card => {
            card.classList.add('flash');
            setTimeout(() => card.classList.remove('flash'), 600);
        });
    }
}

function renderChart(data, days) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const allDates = Object.keys(data).sort();
    const dates = allDates.filter(d =>
        data[d]?.USD && data[d]?.GBP && data[d]?.TRY
    );

    if (dates.length === 0) return;

    const usdTryData = dates.map(d => data[d].TRY / data[d].USD);
    const gbpTryData = dates.map(d => data[d].TRY / data[d].GBP);

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => formatDate(d)),
            datasets: [
                {
                    label: 'USD → TRY',
                    data: usdTryData,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    spanGaps: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#6c5ce7'
                },
                {
                    label: 'GBP → TRY',
                    data: gbpTryData,
                    borderColor: '#fd79a8',
                    backgroundColor: 'rgba(253, 121, 168, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    spanGaps: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#fd79a8'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: { family: 'Inter', size: 11, weight: '600' },
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 26, 0.95)',
                    titleColor: '#fff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: 'Inter', size: 13, weight: '600' },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.25)',
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.25)',
                        font: { family: 'Inter', size: 10 },
                        callback: function(value) {
                            return value.toFixed(4);
                        }
                    }
                }
            }
        }
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
}

function convert() {
    const source = sourceCurrency.value;
    const target = targetCurrency.value;
    const amount = parseFloat(sourceAmount.value) || 0;

    if (!source || !target || amount === 0) {
        targetAmount.value = '';
        resultText.textContent = 'Sonuç: —';
        return;
    }

    const sourceInEur = currentRates[source];
    const targetInEur = currentRates[target];

    if (!sourceInEur || !targetInEur || targetInEur === 0) {
        targetAmount.value = '';
        resultText.textContent = 'Sonuç: —';
        return;
    }

    const rate = targetInEur / sourceInEur;
    const converted = amount * rate;
    targetAmount.value = converted.toFixed(4);
    resultText.textContent = `${amount.toFixed(2)} ${source} = ${converted.toFixed(4)} ${target}`;
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    let count = 30;
    countdownText.textContent = '30s';
    fetchLatestRates();
    pollInterval = setInterval(() => {
        count--;
        if (count <= 0) {
            count = 30;
            fetchLatestRates();
        }
        countdownText.textContent = `${count}s`;
    }, 1000);
}

function handleManualRefresh() {
    refreshBtn.classList.add('spinning');
    fetchLatestRates();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'toast show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

sourceAmount.addEventListener('input', convert);
sourceCurrency.addEventListener('change', convert);
targetCurrency.addEventListener('change', convert);

swapBtn.addEventListener('click', () => {
    const tempCode = sourceCurrency.value;
    const tempAmt = sourceAmount.value;
    sourceCurrency.value = targetCurrency.value;
    targetCurrency.value = tempCode;
    sourceAmount.value = targetAmount.value || '';
    targetAmount.value = '';
    convert();
});

refreshBtn.addEventListener('click', handleManualRefresh);

document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchHistoricalData(parseInt(btn.dataset.period));
    });
});

baseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        baseBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayBase = btn.dataset.base;
        renderCurrencyCards();
    });
});

populateDropdowns();
startPolling();
fetchHistoricalData(getSelectedPeriod());

const style = document.createElement('style');
style.textContent = `
@keyframes spin-slow { to { transform: rotate(360deg); } }
.countdown-icon { display: inline-block; animation: spin-slow 3s linear infinite; }
#toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px); background: linear-gradient(135deg,#6c5ce7,#a29bfe); color: #fff; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; font-family: Inter, sans-serif; opacity: 0; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); pointer-events: none; z-index: 999; box-shadow: 0 8px 30px rgba(108,92,231,0.4); }
#toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;
document.head.appendChild(style);
