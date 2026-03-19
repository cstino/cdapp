// js/pages/dashboard.js
import Chart from 'chart.js/auto';

export const renderDashboard = async (container, state) => {
    const html = `
        <div class="dashboard-container animate-fade">
            <div class="glass-card balance-card">
                <div class="card-header">
                    <span class="label">Bilancio Attuale</span>
                    <div class="trend-badge positive">
                        <i data-lucide="trending-up"></i>
                        <span>+2.4%</span>
                    </div>
                </div>
                <h1 class="balance-amount">€ ${parseFloat(state.balance).toLocaleString('it-IT')}</h1>
                <div class="card-footer">
                    <div class="sub-info">
                        <span class="label">Entrate</span>
                        <span class="value">€ 15.200</span>
                    </div>
                    <div class="sub-info">
                        <span class="label">Uscite</span>
                        <span class="value">€ 4.500</span>
                    </div>
                </div>
            </div>

            <div class="section-header">
                <h3>Stato del Fondo</h3>
                <button class="more-btn"><i data-lucide="bell"></i></button>
            </div>
            <div class="glass-card chart-container">
                <canvas id="fundChart"></canvas>
            </div>

            <div class="section-header">
                <h3>Ultimi Movimenti</h3>
                <a href="#" class="view-all">Vedi tutti</a>
            </div>
            <div class="movements-list">
                ${state.transactions.length > 0 ? state.transactions.map(t => `
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
    `;

    container.innerHTML = html;
    initChart();
};

const initChart = () => {
    const ctx = document.getElementById('fundChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
            datasets: [{
                label: 'Bilancio',
                data: [42000, 45000, 44000, 48000, 47000, 50000],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
};
