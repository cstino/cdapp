// js/pages/login.js
import { supabase } from '../supabase.js';
import app from '../../main.js';

export const renderLogin = (container) => {
    const html = `
        <div class="login-container animate-fade">
            <div class="login-header">
                <div class="logo-icon">
                    <i data-lucide="shield-check"></i>
                </div>
                <h1>CDA Fund</h1>
                <p>Accedi per gestire il fondo</p>
            </div>

            <div class="glass-card login-card">
                <form id="login-form">
                    <div class="form-group">
                        <label>Email o Username</label>
                        <input type="text" id="login-identifier" placeholder="Inserisci il tuo id..." required autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <div class="password-input">
                            <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password">
                        </div>
                    </div>
                    <button type="submit" class="btn-primary w-full" id="login-btn">
                        Entra
                    </button>
                    <div id="login-error" class="error-msg" style="display: none; color: var(--danger); font-size: 13px; text-align: center; margin-top: 12px;"></div>
                </form>
            </div>
            
            <div class="login-footer">
                <p>Software protetto da crittografia end-to-end</p>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add some inline styles for login if not in style.css
    const style = document.createElement('style');
    style.textContent = `
        .login-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            padding: 20px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--accent-color), var(--accent-secondary));
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            color: white;
            box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4);
        }
        .logo-icon i { width: 32px; height: 32px; }
        .login-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
        .login-header p { color: var(--text-secondary); font-size: 15px; }
        .login-card { width: 100%; max-width: 340px; }
        .w-full { width: 100%; }
        .login-footer { margin-top: 40px; color: var(--text-secondary); font-size: 12px; opacity: 0.6; }
    `;
    document.head.appendChild(style);

    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Caricamento...';
        errorDiv.style.display = 'none';

        // Map identifier to email if it's not an email
        let email = identifier;
        if (!identifier.includes('@')) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', identifier)
                    .single();

                if (profile) email = profile.email;
            } catch (err) {
                console.warn('Profile lookup failed, trying direct email login:', err);
            }
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorDiv.textContent = 'Credenziali non valide. Riprova.';
            errorDiv.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Entra';
        } else {
            // Success! The app will re-init automatically
            window.location.reload(); 
        }
    });

    // Re-init generic icons
    import('../../main.js').then(m => m.initIcons());
};
