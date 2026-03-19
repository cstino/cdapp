import { createIcons, Bell, Home, LayoutGrid, User, Plus, Check, X, Link as LinkIcon, TrendingUp, TrendingDown, ShieldCheck, Mail, Lock, Settings } from 'lucide';
import { getState, checkOperationsStatus } from './js/state.js';
import { renderDashboard } from './js/pages/dashboard.js';
import { renderOperations } from './js/pages/operations.js';
import { renderLogin } from './js/pages/login.js';
import { renderMembers } from './js/pages/members.js';
import { supabase } from './js/supabase.js';

const initIcons = () => {
    createIcons({
        icons: { Bell, Home, LayoutGrid, User, Plus, Check, X, LinkIcon, TrendingUp, TrendingDown, ShieldCheck, Mail, Lock, Settings }
    });
};

const app = {
    currentPage: 'dashboard',
    state: null,

    async init() {
        console.log('App initializing with Supabase Auth...');

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            this.state = null;
            this.renderLogin();
        } else {
            this.state = await getState();
            if (this.state) {
                await checkOperationsStatus();
                this.updateUIForUser();
                await this.render();
            } else {
                this.renderLogin();
            }
        }
        this.setupEventListeners();
    },

    updateUIForUser() {
        if (!this.state) return;
        const profile = this.state.profile;
        document.querySelector('.user-name').textContent = profile.username || 'Membro CDA';
        document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=233554&color=fff`;

        // Add Admin button if superadmin
        if (profile.role === 'superadmin' && !document.querySelector('[data-page="members"]')) {
            const nav = document.querySelector('.bottom-nav');
            const profileBtn = document.querySelector('[data-page="profile"]');
            const membersBtn = document.createElement('button');
            membersBtn.className = 'nav-item';
            membersBtn.setAttribute('data-page', 'members');
            membersBtn.innerHTML = `
                <i data-lucide="shield-check"></i>
                <span>Membri</span>
            `;
            nav.insertBefore(membersBtn, profileBtn);
            initIcons();
        }

        // Show/hide bottom nav based on auth
        document.querySelector('.bottom-nav').style.display = 'flex';
        document.querySelector('.app-header').style.display = 'flex';
    },

    renderLogin() {
        const mainContent = document.getElementById('main-content');
        document.querySelector('.bottom-nav').style.display = 'none';
        document.querySelector('.app-header').style.display = 'none';
        renderLogin(mainContent);
    },

    async render() {
        if (!this.state) return;
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '<div class="loading">Caricamento...</div>';

        this.state = await getState();
        mainContent.innerHTML = '';

        if (this.currentPage === 'dashboard') {
            await renderDashboard(mainContent, this.state);
        } else if (this.currentPage === 'operations') {
            await renderOperations(mainContent, this.state);
        } else if (this.currentPage === 'members') {
            await renderMembers(mainContent, this.state);
        } else if (this.currentPage === 'profile') {
            mainContent.innerHTML = `<div class="profile-placeholder glass-card animate-fade"><h3>Il tuo Profilo</h3><p>Work in progress...</p><button id="logout-btn" class="btn-secondary w-full" style="margin-top: 20px;">Esci</button></div>`;
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        }

        initIcons();
    },

    setupEventListeners() {
        // Event delegation for nav items as they might be dynamic
        document.querySelector('.bottom-nav').addEventListener('click', async (e) => {
            const btn = e.target.closest('.nav-item');
            if (!btn) return;

            const page = btn.getAttribute('data-page');
            this.currentPage = page;

            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            await this.render();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
export default app;
