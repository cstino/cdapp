import Chart from 'chart.js/auto';

export const renderDashboard = async (container, state) => {
    // Calculate real stats
    const totalIn = state.transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalOut = state.transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Calculate a simple trend (last 7 days vs total or similar)
    const recentIn = state.transactions
        .filter(t => t.type === 'in' && (new Date() - new Date(t.date)) < 7 * 24 * 60 * 60 * 1000)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const trendPercent = totalIn > 0 ? ((recentIn / totalIn) * 100).toFixed(1) : "0.0";

    const html = `
        <div class="dashboard-container animate-fade">
            <div class="glass-card balance-card">
                <div class="card-header">
                    <span class="label">Bilancio Attuale</span>
                    <div class="trend-badge positive">
                        <i data-lucide="trending-up"></i>
                        <span>+${trendPercent}%</span>
                    </div>
                </div>
                <h1 class="balance-amount">€ ${parseFloat(state.balance).toLocaleString('it-IT')}</h1>
                ${state.profile.role === 'superadmin' ? `
                    <button id="topup-btn" class="vote-btn approve" style="margin-bottom: 20px; width: auto; padding: 10px 20px;">
                        <i data-lucide="plus"></i> Ricarica Fondo
                    </button>
                ` : ''}
                <div class="card-footer">
                    <div class="sub-info">
                        <span class="label">Entrate Totali</span>
                        <span class="value">€ ${totalIn.toLocaleString('it-IT')}</span>
                    </div>
                    <div class="sub-info">
                        <span class="label">Uscite Totali</span>
                        <span class="value">€ ${totalOut.toLocaleString('it-IT')}</span>
                    </div>
                </div>
            </div>

            <div class="section-header">
                <h3>Andamento Fondo</h3>
            </div>
            <div class="glass-card chart-container">
                <canvas id="fundChart"></canvas>
            </div>

            <div class="section-header">
                <h3>Ultimi Movimenti</h3>
                <a href="#" class="view-all">Vedi tutti</a>
            </div>
            <div class="movements-list">
                ${state.transactions.length > 0 ? state.transactions.slice(0, 5).map(t => `
                    <div class="movement-item glass-card">
                        <div class="movement-icon ${t.type}">
                            <i data-lucide="${t.type === 'in' ? 'trending-up' : 'trending-down'}"></i>
                        </div>
                        <div class="movement-details">
                            <span class="title">${t.description}</span>
                            <span class="date">${new Date(t.date).toLocaleDateString('it-IT')}</span>
                        </div>
                        <span class="amount ${t.type}">${t.type === 'in' ? '+' : '-'} € ${parseFloat(t.amount).toLocaleString('it-IT')}</span>
                    </div>
                `).join('') : '<p class="empty-msg">Nessun movimento registrato.</p>'}
            </div>
        </div>

        <div id="topup-modal" class="modal">
            <div class="modal-content glass-card">
                <h3>Ricarica Fondo</h3>
                <form id="topup-form">
                    <div class="form-group">
                        <label>Importo (€)</label>
                        <input type="number" id="topup-amount" step="0.01" placeholder="0.00" required>
                    </div>
                    <div class="form-group">
                        <label>Descrizione / Nota</label>
                        <input type="text" id="topup-desc" placeholder="Es: Ricarica mensile" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="close-topup" class="btn-secondary">Annulla</button>
                        <button type="submit" class="btn-primary">Conferma</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = html;
    initChart(state);

    // Re-init generic icons for dynamic content
    import('../../main.js').then(m => m.initIcons());
    setupDashboardListeners(state);
};

const setupDashboardListeners = (state) => {
    const topupBtn = document.getElementById('topup-btn');
    const modal = document.getElementById('topup-modal');
    const closeBtn = document.getElementById('close-topup');
    const form = document.getElementById('topup-form');

    topupBtn?.addEventListener('click', () => modal.classList.add('open'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('open'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('topup-amount').value);
        const description = document.getElementById('topup-desc').value;

        const { topUpBalance } = await import('../state.js');
        const success = await topUpBalance(amount, description);

        if (success) {
            import('../../main.js').then(m => m.default.showToast('Fondo ricaricato!'));
            modal.classList.remove('open');
            form.reset();
        } else {
            import('../../main.js').then(m => m.default.showToast('Errore ricarica', 'error'));
        }
    });
};

const initChart = (state) => {
    const ctx = document.getElementById('fundChart');
    if (!ctx) return;

    // Generate historical points
    let current = parseFloat(state.balance);
    const points = [current];
    const labels = ['Oggi'];

    // Go back through last 5 transactions to build history
    state.transactions.slice(0, 5).forEach((t, i) => {
        const change = t.type === 'in' ? parseFloat(t.amount) : -parseFloat(t.amount);
        current -= change;
        points.unshift(current);
        labels.unshift(new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }));
    });

    // If no transactions, add a baseline
    if (points.length === 1) {
        points.unshift(current);
        labels.unshift('Inizio');
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bilancio',
                data: points,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: {
                    display: false
                }
            }
        }
    });
};
