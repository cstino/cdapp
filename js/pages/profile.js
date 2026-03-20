// js/pages/profile.js
import app from '../../main.js';
import { supabase } from '../supabase.js';

export const renderProfile = async (container, state) => {
    const profile = state.profile;
    const html = `
        <div class="profile-container animate-fade">
            <div class="page-header">
                <h1>Il tuo Profilo</h1>
            </div>

            <div class="glass-card profile-card">
                <div class="profile-header-large">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=3b82f6&color=fff&size=128" 
                         alt="Avatar" class="profile-avatar-large">
                    <h2>${profile.username}</h2>
                    <span class="role-badge ${profile.role}">${profile.role.toUpperCase()}</span>
                </div>

                <div class="profile-info-grid">
                    <div class="info-item">
                        <span class="label">Email</span>
                        <span class="value">${profile.email || state.user.email}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">ID Utente</span>
                        <span class="value">${profile.id.substring(0, 8)}...</span>
                    </div>
                </div>

                <div class="profile-actions">
                    <button id="change-pass-btn" class="btn-secondary">
                        <i data-lucide="lock"></i> Cambia Password
                    </button>
                    <button id="logout-btn" class="btn-danger">
                        <i data-lucide="log-out"></i> Esci dall'Account
                    </button>
                </div>
            </div>

            <div id="pass-modal" class="modal">
                <div class="modal-content glass-card">
                    <h3>Cambia Password</h3>
                    <form id="pass-form">
                        <div class="form-group">
                            <label>Nuova Password</label>
                            <input type="password" id="new-password" placeholder="Minimo 6 caratteri" required minlength="6">
                        </div>
                        <div class="modal-actions">
                            <button type="button" id="close-pass-modal" class="btn-secondary">Annulla</button>
                            <button type="submit" class="btn-primary">Aggiorna</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    import('../../main.js').then(m => m.initIcons());
    setupProfileListeners();
};

const setupProfileListeners = () => {
    const logoutBtn = document.getElementById('logout-btn');
    const changeBtn = document.getElementById('change-pass-btn');
    const modal = document.getElementById('pass-modal');
    const closeBtn = document.getElementById('close-pass-modal');
    const form = document.getElementById('pass-form');

    logoutBtn?.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            app.showToast(error.message, 'error');
        } else {
            window.location.reload();
        }
    });

    changeBtn?.addEventListener('click', () => modal.classList.add('open'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('open'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        
        if (error) {
            app.showToast(error.message, 'error');
        } else {
            app.showToast('Password aggiornata con successo!');
            modal.classList.remove('open');
            form.reset();
        }
    });

    import('../../main.js').then(m => m.initIcons());
};
