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

            <div id="member-modal" class="modal">
                <div class="modal-content glass-card">
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
        </div>
    `;

    container.innerHTML = html;

    // Add specific styles for members page
    if (!document.getElementById('members-style')) {
        const style = document.createElement('style');
        style.id = 'members-style';
        style.textContent = `
            .members-list { margin-top: 32px; }
            .member-item { display: flex; align-items: center; gap: 16px; padding: 16px; margin-bottom: 12px; }
            .member-avatar { width: 44px; height: 44px; border-radius: 12px; background: var(--secondary-bg); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--accent-color); }
            .member-info { flex: 1; display: flex; flex-direction: column; }
            .member-info .name { font-weight: 600; font-size: 15px; }
            .member-info .role { font-size: 12px; color: var(--text-secondary); }
            .feedback-banner { padding: 16px; border-radius: 16px; margin-bottom: 24px; text-align: center; }
            .feedback-banner.success { background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: var(--success); }
            .feedback-banner.error { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: var(--danger); }
        `;
        document.head.appendChild(style);
    }

    await fetchAndRenderMembers();
    setupMembersEventListeners();
};

const fetchAndRenderMembers = async () => {
    const listContainer = document.getElementById('members-items');
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
            <div class="member-status">
                <i data-lucide="check" style="color: var(--success); width: 16px;"></i>
            </div>
        </div>
    `).join('');

    import('lucide').then(({ createIcons, Check }) => createIcons({ icons: { Check } }));
};

const setupMembersEventListeners = () => {
    const addBtn = document.getElementById('add-member-btn');
    const modal = document.getElementById('member-modal');
    const closeBtn = document.getElementById('close-member-modal');
    const form = document.getElementById('member-form');
    const feedback = document.getElementById('admin-feedback');
    const feedbackMsg = document.getElementById('feedback-msg');

    addBtn?.addEventListener('click', () => modal.classList.add('open'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('open'));

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
            // 1. Create user in Auth
            const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { username, role }
            });

            if (authError) throw authError;

            // 2. Create profile record (usually handled by triggers, but let's be explicit if not)
            const { error: profError } = await adminSupabase.from('profiles').insert([{
                id: authData.user.id,
                username,
                role
            }]);

            if (profError) throw profError;

            // Success
            modal.classList.remove('open');
            feedback.style.display = 'block';
            feedback.className = 'glass-card feedback-banner success';
            feedbackMsg.innerHTML = `Account per <strong>${username}</strong> creato!<br>User: ${email}<br>Pass: ${password}`;
            await fetchAndRenderMembers();
            form.reset();
        } catch (err) {
            console.error(err);
            feedback.style.display = 'block';
            feedback.className = 'glass-card feedback-banner error';
            feedbackMsg.textContent = "Errore: " + (err.message || "Impossibile creare l'utente.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crea Account';
        }
    });
};
