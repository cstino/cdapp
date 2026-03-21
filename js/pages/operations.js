// js/pages/operations.js
import { addOperation, voteOperation, completeOperation } from '../state.js';
import app from '../../main.js';

export const renderOperations = async (container, state) => {
    const html = `
        <div class="operations-container animate-fade">
            <div class="page-header">
                <h1>Operazioni</h1>
                <button id="add-op-btn" class="add-btn">
                    <i data-lucide="plus"></i>
                </button>
            </div>

            <div class="tabs">
                <button class="tab-btn active" data-tab="pending">In Pending</button>
                <button class="tab-btn" data-tab="approved">Approvate</button>
                <button class="tab-btn" data-tab="rejected">Bocciate</button>
            </div>

            <div id="ops-list" class="ops-list">
                ${renderOpsList(state.operations, 'pending')}
            </div>
        </div>

        <div id="op-modal" class="modal">
            <div class="modal-content">
                <h3>Proponi Operazione</h3>
                <form id="op-form">
                    <div class="form-group">
                        <label>Titolo</label>
                        <input type="text" id="op-title" placeholder="Es: Nuovo Server" required>
                    </div>
                    <div class="form-group">
                        <label>Descrizione</label>
                        <textarea id="op-desc" placeholder="Descrivi l'operazione..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Spesa Preventivata (€)</label>
                        <input type="number" id="op-cost" placeholder="0.00" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Link Utili (opzionale)</label>
                        <input type="text" id="op-links" placeholder="www.esempio.it">
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="close-modal" class="btn-secondary">Annulla</button>
                        <button type="submit" class="btn-primary">Pubblica</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = html;
    import('../../main.js').then(m => m.initIcons());
    setupOpsEventListeners(state);
};

const renderOpsList = (operations, filter) => {
    const filtered = operations.filter(op => op.status === filter);
    if (filtered.length === 0) return `<p class="empty-msg">Nessuna operazione ${filter}.</p>`;

    return filtered.map(op => `
        <div class="op-card glass-card animate-fade">
            <div class="op-header">
                <span class="proposer">${op.proposer}</span>
                <div class="op-header-right">
                    ${(op.proposer === app.state.profile.username || app.state.profile.role === 'superadmin') && op.status === 'pending' ? `
                        <button class="delete-btn" data-id="${op.id}">
                            <i data-lucide="trash-2"></i>
                        </button>
                    ` : ''}
                    <span class="timer" data-start="${op.created_at}">
                        <i data-lucide="clock"></i> 
                        ${getRemainingTime(op.created_at)}
                    </span>
                </div>
            </div>
            <h4>${op.title}</h4>
            <p class="desc">${op.description}</p>
            <div class="op-links">
                ${op.links ? `<a href="${op.links}" target="_blank"><i data-lucide="link"></i> Link Utile</a>` : ''}
            </div>
            <div class="op-info">
                <span class="cost">€ ${parseFloat(op.cost).toLocaleString('it-IT')}</span>
                ${filter === 'pending' ? `
                    <div class="votes-badges">
                        <span class="v-badge v">V: ${op.votes_approve}</span>
                        <span class="v-badge x">X: ${op.votes_reject}</span>
                    </div>
                ` : ''}
            </div>
            
            ${filter === 'pending' ? `
                <div class="op-actions">
                    <button class="vote-btn approve ${op.user_vote === 'approve' ? 'active' : ''}" data-id="${op.id}">
                        <i data-lucide="check"></i> Approva
                    </button>
                    <button class="vote-btn reject ${op.user_vote === 'reject' ? 'active' : ''}" data-id="${op.id}">
                        <i data-lucide="x"></i> Boccia
                    </button>
                </div>
            ` : filter === 'approved' ? `
                <div class="op-actions">
                    <button class="complete-btn" data-id="${op.id}">
                        <i data-lucide="check"></i> Completa Operazione
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
};

const getRemainingTime = (createdAt) => {
    const created = new Date(createdAt);
    const end = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = end - now;

    if (diff <= 0) return "Scaduto";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m rimasti`;
};

const setupOpsEventListeners = (state) => {
    const addBtn = document.getElementById('add-op-btn');
    const modal = document.getElementById('op-modal');
    const closeBtn = document.getElementById('close-modal');
    const form = document.getElementById('op-form');

    addBtn?.addEventListener('click', () => {
        modal.classList.add('open');
        loadDraft();
    });
    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('open');
    });

    // Save draft on input
    form?.addEventListener('input', () => {
        const draft = {
            title: document.getElementById('op-title').value,
            description: document.getElementById('op-desc').value,
            cost: document.getElementById('op-cost').value,
            links: document.getElementById('op-links').value
        };
        localStorage.setItem('op_draft', JSON.stringify(draft));
    });

    const loadDraft = () => {
        const saved = localStorage.getItem('op_draft');
        if (saved) {
            const draft = JSON.parse(saved);
            document.getElementById('op-title').value = draft.title || '';
            document.getElementById('op-desc').value = draft.description || '';
            document.getElementById('op-cost').value = draft.cost || '';
            document.getElementById('op-links').value = draft.links || '';
        }
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        let links = document.getElementById('op-links').value.trim();
        if (links && !links.startsWith('http')) {
            links = 'https://' + links;
        }

        const newOp = {
            title: document.getElementById('op-title').value,
            description: document.getElementById('op-desc').value,
            cost: parseFloat(document.getElementById('op-cost').value.replace(',', '.')),
            links: links,
            proposer: state.profile.username || "Membro CDA"
        };
        await addOperation(newOp);
        modal.classList.remove('open');
        localStorage.removeItem('op_draft');
        form.reset();
        app.showToast('Proposta pubblicata con successo!');
        await app.render();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            const list = document.getElementById('ops-list');
            list.innerHTML = renderOpsList(state.operations, tab);
            import('../../main.js').then(m => m.initIcons());
            attachOpActions();
        });
    });

    attachOpActions();
};

const attachOpActions = () => {
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const type = btn.classList.contains('approve') ? 'approve' : 'reject';
            await voteOperation(id, type);
            app.showToast(type === 'approve' ? 'Hai approvato la proposta' : 'Hai bocciato la proposta');
            await app.render();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (confirm('Sei sicuro di voler eliminare questa proposta?')) {
                try {
                    const { deleteOperation } = await import('../state.js');
                    await deleteOperation(id);
                    app.showToast('Proposta eliminata');
                    // Force refresh state before re-rendering
                    location.hash = '#/operations'; // Trigger hash change safely
                    await app.render();
                } catch (err) {
                    app.showToast(err.message, 'error');
                }
            }
        });
    });

    document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            try {
                await completeOperation(id);
                app.showToast('Operazione completata e bilancio aggiornato!');
                await app.render();
            } catch (err) {
                app.showToast(err.message, 'error');
            }
        });
    });
};
