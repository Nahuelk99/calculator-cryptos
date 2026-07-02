// ── Google Apps Script ──────────────────────────────────────
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMYdjDi48pZuVZiHbLfipuFU5Z0uW_lQnjn3DoOeKhTZnEyYAofxbEJpWzG7KT8egsiA/exec';

async function gas(params) {
    const url = GAS_URL + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    return res.json();
}

// ── State ───────────────────────────────────────────────────
let state = {
    portfolio: [],
    sales: [],
    customPairs: [],
    selectedPair: 'BTCUSDT',
    activeMode: 'buy'
};

const DEFAULT_PAIRS = [];

function getQuoteCurrency(pair) {
    if (pair.endsWith('USDT')) return 'USDT';
    if (pair.endsWith('ARS')) return 'ARS';
    return pair.slice(-3);
}

function fmt(value, decimals = 2) {
    return value.toLocaleString('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// ── Selectors ───────────────────────────────────────────────
const selectors = {
    customSelect: document.getElementById('custom-pair-select'),
    selectTrigger: document.querySelector('.select-trigger'),
    selectedPairText: document.getElementById('selected-pair-text'),
    optionsList: document.getElementById('pair-options-list'),
    priceInput: document.getElementById('input-price'),
    amountInput: document.getElementById('input-amount'),
    amountLabel: document.getElementById('label-amount'),
    addEntryBtn: document.getElementById('add-entry'),
    entriesList: document.getElementById('entries-list'),
    entryCount: document.getElementById('entry-count'),
    totalUsdt: document.getElementById('stat-total-usdt'),
    avgPrice: document.getElementById('stat-avg-price'),
    sellPrice: document.getElementById('sell-price'),
    sellQty: document.getElementById('sell-qty'),
    pnlValue: document.getElementById('pnl-value'),
    pnlPercent: document.getElementById('pnl-percent'),
    pnlContainer: document.querySelector('.pnl-result-container'),
    resetBtn: document.getElementById('reset-btn'),
    addPairBtn: document.getElementById('add-pair-btn'),
    pairModal: document.getElementById('pair-modal'),
    newPairInput: document.getElementById('new-pair-input'),
    savePairBtn: document.getElementById('save-pair'),
    cancelPairBtn: document.getElementById('cancel-pair'),
    tabBuy: document.getElementById('tab-buy'),
    tabSell: document.getElementById('tab-sell'),
    buySection: document.getElementById('mode-buy-section'),
    sellSection: document.getElementById('mode-sell-section'),
    listTitle: document.getElementById('list-title'),
    registerSaleBtn: document.getElementById('register-sale'),
    globalInvested: document.getElementById('stat-global-invested'),
    globalPnl: document.getElementById('stat-global-pnl')
};

// ── DB Layer ────────────────────────────────────────────────
async function loadState() {
    const data = await gas({ action: 'load' });
    if (data.error) throw new Error(data.error);
    state.portfolio = data.portfolio || [];
    state.sales = data.sales || [];
    state.customPairs = data.customPairs || [];
    if (state.customPairs.length > 0) state.selectedPair = state.customPairs[0];
}

// ── Init ────────────────────────────────────────────────────
async function init() {
    selectors.entriesList.innerHTML = '<div class="empty-state">Conectando...</div>';

    try {
        await loadState();
    } catch (e) {
        selectors.entriesList.innerHTML = '<div class="empty-state">Error al cargar datos. Revisá tu conexión.</div>';
        return;
    }

    renderOptions();
    updateSelectedPair(state.selectedPair);
    registerEvents();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('SW Registration Failed', err));
    }
}

// ── Render ──────────────────────────────────────────────────
function renderOptions() {
    selectors.optionsList.innerHTML = '';
    const allPairs = [...DEFAULT_PAIRS, ...state.customPairs];

    allPairs.forEach(pair => {
        const div = document.createElement('div');
        div.className = `option-item ${state.selectedPair === pair ? 'selected' : ''}`;
        div.textContent = pair;
        div.onclick = (e) => {
            e.stopPropagation();
            updateSelectedPair(pair);
            selectors.customSelect.classList.remove('active');
        };
        selectors.optionsList.appendChild(div);
    });
}

function updateSelectedPair(pair) {
    state.selectedPair = pair;
    selectors.selectedPairText.textContent = pair;
    const currency = getQuoteCurrency(pair);
    selectors.amountLabel.textContent = `Monto (${currency})`;
    renderOptions();
    renderEntries();
}

function renderEntries() {
    const selectedPair = state.selectedPair;
    const isBuyMode = state.activeMode === 'buy';

    const data = isBuyMode ? state.portfolio : state.sales;
    const filtered = data.filter(e => e.pair === selectedPair);

    selectors.entriesList.innerHTML = '';

    const currency = getQuoteCurrency(selectedPair);
    const buys = state.portfolio.filter(e => e.pair === selectedPair);
    let totalUsdtBuy = 0;
    let totalQtyBuy = 0;
    buys.forEach(e => { totalUsdtBuy += e.amount; totalQtyBuy += e.qty; });
    const avgPriceBuy = totalQtyBuy > 0 ? totalUsdtBuy / totalQtyBuy : 0;

    selectors.totalUsdt.innerHTML = `${fmt(totalUsdtBuy)} <small>${currency}</small>`;
    selectors.avgPrice.textContent = fmt(avgPriceBuy, avgPriceBuy < 1 && avgPriceBuy > 0 ? 6 : 2);

    if (filtered.length === 0) {
        selectors.entriesList.innerHTML = `<div class="empty-state">No hay ${isBuyMode ? 'entradas' : 'ventas'} para ${selectedPair}</div>`;
        selectors.entryCount.textContent = '0';
        if (isBuyMode) selectors.sellQty.value = '';
        updatePnL();
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'entry-item';

        if (isBuyMode) {
            div.innerHTML = `
                <div class="entry-info">
                    <span>$${fmt(item.price)}</span>
                    <span style="color: var(--text-dim)">(${fmt(item.amount)} ${currency})</span>
                </div>
                <button class="remove-btn" data-id="${item.id}">&times;</button>
            `;
        } else {
            const pnlClass = item.pnl >= 0 ? 'positive' : 'negative';
            div.innerHTML = `
                <div class="entry-info">
                    <span style="color: var(--text-main)">$${fmt(item.price)}</span>
                    <span class="${pnlClass}" style="margin-left: 8px; font-weight: 700;">${item.pnl >= 0 ? '+' : '-'}$${fmt(Math.abs(item.pnl))}</span>
                </div>
                <button class="remove-btn" data-id="${item.id}" data-type="sale">&times;</button>
            `;
        }
        selectors.entriesList.appendChild(div);
    });

    selectors.entryCount.textContent = filtered.length;

    if (isBuyMode) {
        selectors.sellQty.value = totalQtyBuy.toFixed(6);
    }

    updatePnL();
    renderGlobalStats();
}

function updatePnL() {
    const sellPrice = parseFloat(selectors.sellPrice.value);
    const sellQty = parseFloat(selectors.sellQty.value);

    const filtered = state.portfolio.filter(e => e.pair === state.selectedPair);

    if (filtered.length === 0 || isNaN(sellPrice) || isNaN(sellQty) || sellPrice <= 0 || sellQty <= 0) {
        selectors.pnlValue.textContent = '$0.00';
        selectors.pnlPercent.textContent = '0.00%';
        selectors.pnlValue.className = '';
        selectors.pnlPercent.className = '';
        return;
    }

    let totalUsdt = 0;
    let totalQty = 0;
    filtered.forEach(e => { totalUsdt += e.amount; totalQty += e.qty; });
    const avgPrice = totalUsdt / totalQty;

    const pnl = (sellQty * sellPrice) - (sellQty * avgPrice);
    const percent = ((sellPrice - avgPrice) / avgPrice) * 100;

    selectors.pnlValue.textContent = `${pnl >= 0 ? '+' : '-'}$${fmt(Math.abs(pnl))}`;
    selectors.pnlPercent.textContent = `${fmt(Math.abs(percent))}%`;

    const statusClass = pnl >= 0 ? 'positive' : 'negative';
    selectors.pnlValue.className = statusClass;
    selectors.pnlPercent.className = statusClass;

    selectors.pnlContainer.classList.remove('pnl-pulse');
    void selectors.pnlContainer.offsetWidth;
    selectors.pnlContainer.classList.add('pnl-pulse');
}

function renderGlobalStats() {
    const usdtPortfolio = state.portfolio.filter(e => getQuoteCurrency(e.pair) === 'USDT');
    const usdtSales = state.sales.filter(e => getQuoteCurrency(e.pair) === 'USDT');

    const totalInvested = usdtPortfolio.reduce((sum, e) => sum + e.amount, 0);
    const totalPnl = usdtSales.reduce((sum, e) => sum + e.pnl, 0);

    selectors.globalInvested.innerHTML = `${fmt(totalInvested)} <small>USDT</small>`;

    const pnlSign = totalPnl >= 0 ? '+' : '-';
    const pnlClass = totalPnl >= 0 ? 'positive' : 'negative';
    const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    selectors.globalPnl.innerHTML = `<span class="${pnlClass}">${pnlSign}${fmt(Math.abs(totalPnl))} <small>USDT</small> <small>(${pnlSign}${fmt(Math.abs(pnlPercent))}%)</small></span>`;
}

function switchMode(mode) {
    state.activeMode = mode;
    selectors.tabBuy.classList.toggle('active', mode === 'buy');
    selectors.tabSell.classList.toggle('active', mode === 'sell');
    selectors.buySection.classList.toggle('active', mode === 'buy');
    selectors.sellSection.classList.toggle('active', mode === 'sell');
    selectors.listTitle.textContent = mode === 'buy' ? 'Entradas Registradas' : 'Ventas Realizadas';
    renderEntries();
}

// ── Events ──────────────────────────────────────────────────
function registerEvents() {
    selectors.tabBuy.onclick = () => switchMode('buy');
    selectors.tabSell.onclick = () => switchMode('sell');

    selectors.selectTrigger.onclick = (e) => {
        e.stopPropagation();
        selectors.customSelect.classList.toggle('active');
    };

    document.addEventListener('click', () => {
        selectors.customSelect.classList.remove('active');
    });

    // Add buy entry
    selectors.addEntryBtn.onclick = async () => {
        const price = parseFloat(selectors.priceInput.value);
        const amount = parseFloat(selectors.amountInput.value);

        if (isNaN(price) || isNaN(amount) || price <= 0 || amount <= 0) {
            alert('Por favor, ingresa valores válidos.');
            return;
        }

        const entry = {
            id: Date.now(),
            pair: state.selectedPair,
            price,
            amount,
            qty: amount / price,
            timestamp: new Date().toISOString()
        };

        selectors.addEntryBtn.disabled = true;
        const res = await gas({ action: 'insert', table: 'portfolio', row: JSON.stringify(entry) });
        selectors.addEntryBtn.disabled = false;

        if (res.error) { alert('Error al guardar. Intentá de nuevo.'); return; }

        state.portfolio.push(entry);
        renderEntries();
        selectors.priceInput.value = '';
        selectors.amountInput.value = '';
    };

    // Remove entry / sale
    selectors.entriesList.onclick = async (e) => {
        if (!e.target.classList.contains('remove-btn')) return;

        const id = parseInt(e.target.getAttribute('data-id'));
        const type = e.target.getAttribute('data-type');

        e.target.disabled = true;

        if (type === 'sale') {
            const res = await gas({ action: 'delete', table: 'sales', id });
            if (res.error) { e.target.disabled = false; alert('Error al eliminar.'); return; }
            state.sales = state.sales.filter(item => String(item.id) !== String(id));
        } else {
            const res = await gas({ action: 'delete', table: 'portfolio', id });
            if (res.error) { e.target.disabled = false; alert('Error al eliminar.'); return; }
            state.portfolio = state.portfolio.filter(item => String(item.id) !== String(id));
        }

        renderEntries();
    };

    selectors.sellPrice.oninput = updatePnL;
    selectors.sellQty.oninput = updatePnL;

    // Register sale
    selectors.registerSaleBtn.onclick = async () => {
        const sellPrice = parseFloat(selectors.sellPrice.value);
        const sellQty = parseFloat(selectors.sellQty.value);

        if (isNaN(sellPrice) || isNaN(sellQty) || sellPrice <= 0 || sellQty <= 0) {
            alert('Por favor, ingresa valores válidos para la venta.');
            return;
        }

        const filtered = state.portfolio.filter(e => e.pair === state.selectedPair);
        if (filtered.length === 0) {
            alert('No hay existencias para vender en este par.');
            return;
        }

        let totalUsdt = 0;
        let totalQty = 0;
        filtered.forEach(e => { totalUsdt += e.amount; totalQty += e.qty; });
        const avgPrice = totalUsdt / totalQty;

        const pnl = (sellQty * sellPrice) - (sellQty * avgPrice);
        const percent = ((sellPrice - avgPrice) / avgPrice) * 100;

        const sale = {
            id: Date.now(),
            pair: state.selectedPair,
            price: sellPrice,
            qty: sellQty,
            amount: sellQty * sellPrice,
            pnl,
            percent,
            timestamp: new Date().toISOString()
        };

        selectors.registerSaleBtn.disabled = true;
        const res = await gas({ action: 'insert', table: 'sales', row: JSON.stringify(sale) });
        selectors.registerSaleBtn.disabled = false;

        if (res.error) { alert('Error al registrar venta.'); return; }

        state.sales.push(sale);
        renderEntries();

        alert(`Venta registrada: ${pnl >= 0 ? '+' : '-'}$${fmt(Math.abs(pnl))} (${fmt(Math.abs(percent))}%)`);

        selectors.sellPrice.value = '';
        updatePnL();
    };

    // Reset all
    selectors.resetBtn.onclick = async () => {
        if (!confirm('¿Estás seguro de que querés borrar todos los datos (incluyendo ventas)?')) return;

        selectors.resetBtn.disabled = true;
        await gas({ action: 'reset' });
        selectors.resetBtn.disabled = false;

        state.portfolio = [];
        state.sales = [];
        renderEntries();
        selectors.sellPrice.value = '';
        selectors.sellQty.value = '';
        updatePnL();
    };

    // Add custom pair
    selectors.addPairBtn.onclick = () => {
        selectors.pairModal.style.display = 'flex';
        selectors.newPairInput.focus();
    };

    selectors.cancelPairBtn.onclick = () => {
        selectors.pairModal.style.display = 'none';
        selectors.newPairInput.value = '';
    };

    selectors.savePairBtn.onclick = async () => {
        const newPair = selectors.newPairInput.value.trim().toUpperCase();

        if (!newPair || DEFAULT_PAIRS.includes(newPair) || state.customPairs.includes(newPair)) {
            selectors.pairModal.style.display = 'none';
            selectors.newPairInput.value = '';
            return;
        }

        selectors.savePairBtn.disabled = true;
        const res = await gas({ action: 'insert_pair', pair: newPair });
        selectors.savePairBtn.disabled = false;

        if (!res.error) {
            state.customPairs.push(newPair);
            renderOptions();
            updateSelectedPair(newPair);
        }

        selectors.pairModal.style.display = 'none';
        selectors.newPairInput.value = '';
    };
}

// ── Start ───────────────────────────────────────────────────
init();
