// js/pages/members.js
import { adminSupabase } from '../supabase.js';
import app from '../../main.js';

export const renderMembers = async (container, state) => {
    const html = `
        <div class="members-container animate-fade">
            <div class="page-header">
                <h1>Gestione Membri</h1>
                <button id="add-member-btn" class="add-btn">
                    <i data-lucide="plus"></i>
                </button>
            </div>

            <div class="glass-card feedback-banner" id="admin-feedback" style="display: none;">
                <p id="feedback-msg"></p>
            </div>

            <div class="members-list">
                <h3>Membri Attivi</h3>
                <div id="members-items">
                    <div class="loading">Caricamento membri...</div>
                </div>
            </div>
        </div>

        <div id="member-modal" class="modal">
            <div class="modal-content">
                <h3>Crea Nuovo Account</h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
                    L'email verrà generata automaticamente come username@cda.app
                </p>
                <form id="member-form">
                    <div class="form-group">
                        <label>Username (Nome da visualizzare)</label>
                        <input type="text" id="member-username" placeholder="Es: Mario Rossi" required>
                    </div>
                    <div class="form-group">
                        <label>Password Iniziale</label>
                        <input type="text" id="member-password" placeholder="Password sicura..." required>
                    </div>
                    <div class="form-group">
                        <label>Ruolo</label>
                        <select id="member-role" style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px; color: white;">
                            <option value="member">Membro CDA</option>
                            <option value="superadmin">Superadmin</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="close-member-modal" class="btn-secondary">Annulla</button>
                        <button type="submit" class="btn-primary" id="member-submit">Crea Account</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = html;
    await fetchAndRenderMembers(state.user.id);
    setupMembersEventListeners();
};

const fetchAndRenderMembers = async (currentUserId) => {
    const listContainer = document.getElementById('members-items');
    if (!listContainer) return;

    const { data: profiles, error } = await adminSupabase.from('profiles').select('*').order('username');

    if (error) {
        listContainer.innerHTML = '<p class="error-msg">Errore nel caricamento.</p>';
        return;
    }

    if (!profiles || profiles.length === 0) {
        listContainer.innerHTML = '<p class="empty-msg">Nessun membro trovato.</p>';
        return;
    }

    listContainer.innerHTML = profiles.map(p => `
        <div class="member-item glass-card animate-fade">
            <div class="member-avatar">${p.username.charAt(0).toUpperCase()}</div>
            <div class="member-info">
                <span class="name">${p.username}</span>
                <span class="role">${p.role === 'superadmin' ? 'Superadmin' : 'Membro CDA'}</span>
            </div>
            ${p.id !== currentUserId ? `
                <button class="member-delete-btn" data-id="${p.id}" data-username="${p.username}">
                    <i data-lucide="trash-2"></i>
                </button>
            ` : ''}
        </div>
    `).join('');

    import('../../main.js').then(m => m.initIcons());
    setupDeleteListeners();
};

const setupMembersEventListeners = () => {
    const addBtn = document.getElementById('add-member-btn');
    const modal = document.getElementById('member-modal');
    const closeBtn = document.getElementById('close-member-modal');
    const form = document.getElementById('member-form');

    addBtn?.addEventListener('click', () => {
        modal.classList.add('open');
        loadMemberDraft();
    });
    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('open');
    });

    // Save draft on input
    form?.addEventListener('input', () => {
        const draft = {
            username: document.getElementById('member-username').value,
            password: document.getElementById('member-password').value,
            role: document.getElementById('member-role').value
        };
        localStorage.setItem('member_draft', JSON.stringify(draft));
    });

    const loadMemberDraft = () => {
        const saved = localStorage.getItem('member_draft');
        if (saved) {
            const draft = JSON.parse(saved);
            document.getElementById('member-username').value = draft.username || '';
            document.getElementById('member-password').value = draft.password || '';
            document.getElementById('member-role').value = draft.role || 'member';
        }
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('member-username').value;
        const password = document.getElementById('member-password').value;
        const role = document.getElementById('member-role').value;
        const email = `${username.toLowerCase().replace(/\s+/g, '.')}@cda.app`;
        const submitBtn = document.getElementById('member-submit');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creazione in corso...';

        try {
            const { error: authError, data } = await adminSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { username, role }
            });

            if (authError) throw authError;

            const { error: profError } = await adminSupabase.from('profiles').insert([{
                id: data.user.id,
                username,
                email,
                role
            }]);

            if (profError) throw profError;

            modal.classList.remove('open');
            localStorage.removeItem('member_draft');
            app.showToast(`Utente ${username} creato con successo!`);
            form.reset();
            await fetchAndRenderMembers(app.state.user.id);
        } catch (err) {
            console.error(err);
            app.showToast(err.message || "Impossibile creare l'utente.", 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crea Account';
        }
    });

    setupDeleteListeners();
};

const setupDeleteListeners = () => {
    document.querySelectorAll('.member-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const username = btn.getAttribute('data-username');

            if (confirm(`Sei sicuro di voler rimuovere ${username}? L'azione è irreversibile.`)) {
                try {
                    const { error } = await adminSupabase.auth.admin.deleteUser(id);
                    if (error) throw error;

                    app.showToast(`Utente ${username} rimosso.`);
                    await fetchAndRenderMembers(app.state.user.id);
                } catch (err) {
                    app.showToast(err.message, 'error');
                }
            }
        });
    });
};
