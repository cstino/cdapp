// main.js
import { createIcons, Bell, Home, LayoutGrid, User, Plus, Check, X, Link as LinkIcon, TrendingUp, TrendingDown } from 'lucide';
import { getState, checkOperationsStatus } from './js/state.js';
import { renderDashboard } from './js/pages/dashboard.js';
import { renderOperations } from './js/pages/operations.js';

const initIcons = () => {
    createIcons({
        icons: { Bell, Home, LayoutGrid, User, Plus, Check, X, LinkIcon, TrendingUp, TrendingDown }
    });
};

const app = {
    currentPage: 'dashboard',
    
    async init() {
        console.log('App initializing with Supabase...');
        await checkOperationsStatus();
        await this.render();
        this.setupEventListeners();
    },

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '<div class="loading">Caricamento...</div>';
        
        const state = await getState();
        mainContent.innerHTML = '';
        
        if (this.currentPage === 'dashboard') {
            await renderDashboard(mainContent, state);
        } else if (this.currentPage === 'operations') {
            await renderOperations(mainContent, state);
        }

        initIcons();
    },

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const page = btn.getAttribute('data-page');
                if (page === 'profile') return;
                
                this.currentPage = page;
                
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                await this.render();
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
export default app;
