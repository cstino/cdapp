import { createIcons, Bell, Home, LayoutGrid, User, Plus, Check, X, Link as LinkIcon, TrendingUp, TrendingDown, ShieldCheck, Mail, Lock, Settings, Clock, Trash2, LogOut, Search, Filter } from 'lucide';
import { getState, checkOperationsStatus } from './js/state.js';
import { renderDashboard } from './js/pages/dashboard.js';
import { renderOperations } from './js/pages/operations.js';
import { renderLogin } from './js/pages/login.js';
import { renderMembers } from './js/pages/members.js';
import { renderProfile } from './js/pages/profile.js';
import { supabase } from './js/supabase.js';

export const initIcons = () => {
    createIcons({
        icons: { Bell, Home, LayoutGrid, User, Plus, Check, X, LinkIcon, TrendingUp, TrendingDown, ShieldCheck, Mail, Lock, Settings, Clock, Trash2, LogOut, Search, Filter }
    });
};

const app = {
    currentPage: 'dashboard',
    state: null,

    async init() {
        try {
            console.log('App initializing with Supabase Auth...');
            initIcons();

            // Detect initial page from hash
            const hash = window.location.hash.replace('#', '');
            if (['dashboard', 'operations', 'members', 'profile'].includes(hash)) {
                this.currentPage = hash;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                this.state = null;
                this.renderLogin();
            } else {
                this.state = await getState();
                if (this.state && this.state.profile && this.state.profile.id) {
                    await checkOperationsStatus();
                    this.updateUIForUser();
                    await this.render();
                    this.setupRealtimeListeners();
                } else {
                    console.warn('Session found but profile missing. Logging out...');
                    await supabase.auth.signOut();
                    this.renderLogin();
                }
            }
        } catch (err) {
            console.error('Critical Init Error:', err);
            this.renderLogin();
        }
        this.setupEventListeners();

        // Handle browser back/forward and manual hash change
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.replace('#', '');
            if (newHash && newHash !== this.currentPage) {
                this.currentPage = newHash;
                this.render();
            }
        });
    },

    setupRealtimeListeners() {
        // Listen to everything in public schema (operations, votes, fund_balance, transactions)
        supabase
            .channel('cda-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
                console.log('Realtime update detected, re-fetching state...');
                this.state = await getState();
                await this.render();
            })
            .subscribe();
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
            // initIcons(); // Removed as initIcons is called once on app start and when new elements are added
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

        // Update hash without triggering hashchange twice
        if (window.location.hash !== `#${this.currentPage}`) {
            window.location.hash = this.currentPage;
        }

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-page') === this.currentPage);
        });

        // Show skeleton while fetching
        this.renderSkeleton(mainContent);

        this.state = await getState();
        mainContent.innerHTML = '';

        if (this.currentPage === 'dashboard') {
            await renderDashboard(mainContent, this.state);
        } else if (this.currentPage === 'operations') {
            await renderOperations(mainContent, this.state);
        } else if (this.currentPage === 'members') {
            await renderMembers(mainContent, this.state);
        } else if (this.currentPage === 'profile') {
            await renderProfile(mainContent, this.state);
        }
    },

    renderSkeleton(container) {
        if (this.currentPage === 'dashboard') {
            container.innerHTML = `
                <div class="loading-container animate-fade">
                    <div class="skeleton-card skeleton"></div>
                    <div class="skeleton-text skeleton" style="width: 40%"></div>
                    <div class="skeleton-card skeleton" style="height: 180px"></div>
                    <div class="skeleton-text skeleton" style="width: 50%"></div>
                    <div class="skeleton-card skeleton" style="height: 80px"></div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="loading-container animate-fade">
                    <div class="skeleton-text skeleton" style="font-size: 24px; height: 32px"></div>
                    <div class="skeleton-card skeleton"></div>
                    <div class="skeleton-card skeleton"></div>
                    <div class="skeleton-card skeleton"></div>
                </div>
            `;
        }
    },

    setupEventListeners() {
        document.querySelector('.bottom-nav').addEventListener('click', async (e) => {
            const btn = e.target.closest('.nav-item');
            if (!btn) return;

            const page = btn.getAttribute('data-page');
            this.currentPage = page;

            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            await this.render();
        });
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check' : 'x'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        initIcons();
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
export default app;
