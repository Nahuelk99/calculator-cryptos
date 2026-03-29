// State Management
let state = {
    portfolio: JSON.parse(localStorage.getItem('quantum_calc_portfolio')) || [],
    sales: JSON.parse(localStorage.getItem('quantum_calc_sales')) || [],
    customPairs: JSON.parse(localStorage.getItem('quantum_calc_pairs')) || [],
    selectedPair: 'BTCUSDT',
    activeMode: 'buy' // 'buy' or 'sell'
};

// Selectors
const selectors = {
    customSelect: document.getElementById('custom-pair-select'),
    selectTrigger: document.querySelector('.select-trigger'),
    selectedPairText: document.getElementById('selected-pair-text'),
    optionsList: document.getElementById('pair-options-list'),
    priceInput: document.getElementById('input-price'),
    amountInput: document.getElementById('input-amount'),
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
    // Mode Switching
    tabBuy: document.getElementById('tab-buy'),
    tabSell: document.getElementById('tab-sell'),
    buySection: document.getElementById('mode-buy-section'),
    sellSection: document.getElementById('mode-sell-section'),
    listTitle: document.getElementById('list-title'),
    registerSaleBtn: document.getElementById('register-sale')
};

const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT', 'XRPUSDT', 'LTCUSDT'];

// Initialize
function init() {
    renderOptions();
    renderEntries();
    registerEvents();
    
    // Default selection
    updateSelectedPair(state.selectedPair);
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('SW Registration Failed', err));
    }
}

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
    renderOptions(); // Update selected class
    renderEntries();
}

function saveState() {
    localStorage.setItem('quantum_calc_portfolio', JSON.stringify(state.portfolio));
    localStorage.setItem('quantum_calc_sales', JSON.stringify(state.sales));
    localStorage.setItem('quantum_calc_pairs', JSON.stringify(state.customPairs));
}

function registerEvents() {
    // Tab Switching
    selectors.tabBuy.onclick = () => switchMode('buy');
    selectors.tabSell.onclick = () => switchMode('sell');

    // Custom Select Toggle
    selectors.selectTrigger.onclick = (e) => {
        e.stopPropagation();
        selectors.customSelect.classList.toggle('active');
    };

    // Close select when clicking outside
    document.addEventListener('click', () => {
        selectors.customSelect.classList.remove('active');
    });

    // Add Entry
    selectors.addEntryBtn.onclick = () => {
        const pair = state.selectedPair;
        const price = parseFloat(selectors.priceInput.value);
        const amount = parseFloat(selectors.amountInput.value);

        if (isNaN(price) || isNaN(amount) || price <= 0 || amount <= 0) {
            alert('Por favor, ingresa valores válidos.');
            return;
        }

        const entry = {
            id: Date.now(),
            pair,
            price,
            amount,
            qty: amount / price,
            timestamp: new Date().toISOString()
        };

        state.portfolio.push(entry);
        saveState();
        renderEntries();
        
        // Reset inputs
        selectors.priceInput.value = '';
        selectors.amountInput.value = '';
    };

    // Remove Entry (Event Delegation)
    selectors.entriesList.onclick = (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            const type = e.target.getAttribute('data-type');
            
            if (type === 'sale') {
                state.sales = state.sales.filter(item => item.id !== id);
            } else {
                state.portfolio = state.portfolio.filter(item => item.id !== id);
            }
            
            saveState();
            renderEntries();
        }
    };

    // Simulator Updates
    selectors.sellPrice.oninput = updatePnL;
    selectors.sellQty.oninput = updatePnL;

    // Register Sale
    selectors.registerSaleBtn.onclick = () => {
        const pair = state.selectedPair;
        const sellPrice = parseFloat(selectors.sellPrice.value);
        const sellQty = parseFloat(selectors.sellQty.value);

        if (isNaN(sellPrice) || isNaN(sellQty) || sellPrice <= 0 || sellQty <= 0) {
            alert('Por favor, ingresa valores válidos para la venta.');
            return;
        }

        const filtered = state.portfolio.filter(e => e.pair === pair);
        if (filtered.length === 0) {
            alert('No hay existencias para vender en este par.');
            return;
        }

        let totalUsdt = 0;
        let totalQty = 0;
        filtered.forEach(e => { totalUsdt += e.amount; totalQty += e.qty; });
        const avgPrice = totalUsdt / totalQty;

        const costBasis = sellQty * avgPrice;
        const saleValue = sellQty * sellPrice;
        const pnl = saleValue - costBasis;
        const percent = ((sellPrice - avgPrice) / avgPrice) * 100;

        const sale = {
            id: Date.now(),
            pair,
            price: sellPrice,
            qty: sellQty,
            amount: saleValue,
            pnl,
            percent,
            timestamp: new Date().toISOString()
        };

        state.sales.push(sale);
        saveState();
        renderEntries();
        
        // Visual feedback
        alert(`Venta registrada: $${pnl.toFixed(2)} (${percent.toFixed(2)}%)`);
        
        selectors.sellPrice.value = '';
        updatePnL();
    };

    // Reset All
    selectors.resetBtn.onclick = () => {
        if (confirm('¿Estás seguro de que quieres borrar todos los datos (incluyendo ventas)?')) {
            state.portfolio = [];
            state.sales = [];
            saveState();
            renderEntries();
            selectors.sellPrice.value = '';
            selectors.sellQty.value = '';
            updatePnL();
        }
    };

    // Pair Management
    selectors.addPairBtn.onclick = () => {
        selectors.pairModal.style.display = 'flex';
        selectors.newPairInput.focus();
    };

    selectors.cancelPairBtn.onclick = () => {
        selectors.pairModal.style.display = 'none';
        selectors.newPairInput.value = '';
    };

    selectors.savePairBtn.onclick = () => {
        const newPair = selectors.newPairInput.value.trim().toUpperCase();
        if (newPair && !DEFAULT_PAIRS.includes(newPair) && !state.customPairs.includes(newPair)) {
            state.customPairs.push(newPair);
            saveState();
            renderOptions();
            updateSelectedPair(newPair);
        }
        selectors.pairModal.style.display = 'none';
        selectors.newPairInput.value = '';
    };
}

function switchMode(mode) {
    state.activeMode = mode;
    
    // Update tabs
    selectors.tabBuy.classList.toggle('active', mode === 'buy');
    selectors.tabSell.classList.toggle('active', mode === 'sell');
    
    // Update sections
    selectors.buySection.classList.toggle('active', mode === 'buy');
    selectors.sellSection.classList.toggle('active', mode === 'sell');
    
    // Update list title
    selectors.listTitle.textContent = mode === 'buy' ? 'Entradas Registradas' : 'Ventas Realizadas';
    
    renderEntries();
}

function renderEntries() {
    const selectedPair = state.selectedPair;
    const isBuyMode = state.activeMode === 'buy';
    
    // Choose which history to show
    const data = isBuyMode ? state.portfolio : state.sales;
    const filtered = data.filter(e => e.pair === selectedPair);
    
    selectors.entriesList.innerHTML = '';
    
    // Always calculate buy stats for Context (stat cards)
    const buys = state.portfolio.filter(e => e.pair === selectedPair);
    let totalUsdtBuy = 0;
    let totalQtyBuy = 0;
    buys.forEach(e => { totalUsdtBuy += e.amount; totalQtyBuy += e.qty; });
    const avgPriceBuy = totalQtyBuy > 0 ? totalUsdtBuy / totalQtyBuy : 0;

    selectors.totalUsdt.innerHTML = `${totalUsdtBuy.toFixed(2)} <small>USDT</small>`;
    selectors.avgPrice.textContent = avgPriceBuy.toFixed(avgPriceBuy < 1 && avgPriceBuy > 0 ? 6 : 2);

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
                    <span>$${item.price.toLocaleString()}</span>
                    <span style="color: var(--text-dim)">(${item.amount.toFixed(2)} USDT)</span>
                </div>
                <button class="remove-btn" data-id="${item.id}">&times;</button>
            `;
        } else {
            const pnlClass = item.pnl >= 0 ? 'positive' : 'negative';
            div.innerHTML = `
                <div class="entry-info">
                    <span style="color: var(--text-main)">$${item.price.toLocaleString()}</span>
                    <span class="${pnlClass}" style="margin-left: 8px; font-weight: 700;">${item.pnl >= 0 ? '+' : ''}$${item.pnl.toFixed(2)}</span>
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
}

function updatePnL() {
    const sellPrice = parseFloat(selectors.sellPrice.value);
    const sellQty = parseFloat(selectors.sellQty.value);
    
    // Get average price from current pair stats
    const selectedPair = state.selectedPair;
    const filtered = state.portfolio.filter(e => e.pair === selectedPair);
    
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

    const costBasis = sellQty * avgPrice;
    const saleValue = sellQty * sellPrice;
    const pnl = saleValue - costBasis;
    const percent = ((sellPrice - avgPrice) / avgPrice) * 100;

    selectors.pnlValue.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
    selectors.pnlPercent.textContent = `${percent.toFixed(2)}%`;
    
    const statusClass = pnl >= 0 ? 'positive' : 'negative';
    selectors.pnlValue.className = statusClass;
    selectors.pnlPercent.className = statusClass;
    
    // Trigger animation
    selectors.pnlContainer.classList.remove('pnl-pulse');
    void selectors.pnlContainer.offsetWidth; // Trigger reflow
    selectors.pnlContainer.classList.add('pnl-pulse');
}

// Start App
init();
