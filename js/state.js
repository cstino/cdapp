// js/state.js
import { supabase, adminSupabase } from './supabase.js';

export const getState = async () => {
    // Basic check for logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: balanceData } = await supabase.from('fund_balance').select('amount').limit(1).maybeSingle();
    const { data: operations } = await supabase.from('operations').select('*').order('created_at', { ascending: false });
    const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    // Fetch all votes for active operations to calculate counts correctly
    const { data: votes } = await supabase.from('votes').select('*');

    // Attach current counts and user preference to operations
    const processedOps = (operations || []).map(op => {
        const opVotes = (votes || []).filter(v => v.operation_id === op.id);
        const approveCount = opVotes.filter(v => v.vote_type === 'approve').length;
        const rejectCount = opVotes.filter(v => v.vote_type === 'reject').length;
        const userVote = opVotes.find(v => v.user_id === user.id)?.vote_type || null;

        return {
            ...op,
            votes_approve: approveCount,
            votes_reject: rejectCount,
            user_vote: userVote
        };
    });

    return {
        user,
        profile: profile,
        balance: balanceData?.amount || 0,
        operations: processedOps,
        transactions: transactions || []
    };
};

export const createInitialSuperadmin = async (username, email, password) => {
    try {
        const { data, error } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username, role: 'superadmin' }
        });

        if (error) throw error;

        const { error: profError } = await adminSupabase.from('profiles').insert([{
            id: data.user.id,
            username,
            role: 'superadmin'
        }]);

        if (profError) throw profError;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

export const addOperation = async (operation) => {
    const { data, error } = await supabase.from('operations').insert([{
        ...operation,
        status: 'pending'
    }]).select();

    if (error) console.error('Error adding operation:', error);
    return data?.[0];
};

export const voteOperation = async (operationId, type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use upsert on votes table (constrained by UNIQUE(user_id, operation_id))
    const { error } = await supabase.from('votes').upsert({
        user_id: user.id,
        operation_id: operationId,
        vote_type: type
    }, { onConflict: 'user_id, operation_id' });

    if (error) console.error('Error recording vote:', error);
};

export const completeOperation = async (id) => {
    const { error } = await supabase.rpc('complete_operation', { op_id: id });
    if (error) {
        console.error('Errore durante il completamento:', error.message);
        throw error;
    }
};

export const topUpBalance = async (amount, description) => {
    try {
        const { data: balanceData } = await supabase.from('fund_balance').select('id, amount').single();
        const newBalance = (balanceData?.amount || 0) + amount;

        await supabase.from('fund_balance').update({ amount: newBalance }).eq('id', balanceData.id);

        await supabase.from('transactions').insert([{
            type: 'in',
            description: description || 'Ricarica fondo',
            amount: amount
        }]);

        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

export const checkOperationsStatus = async () => {
    const { data: pendingOps } = await supabase.from('operations').select('*').eq('status', 'pending');
    if (!pendingOps) return;

    const { data: allVotes } = await supabase.from('votes').select('*');

    const now = new Date();
    for (const op of pendingOps) {
        const created = new Date(op.created_at);
        const diff = now - created;
        const hours = diff / (1000 * 60 * 60);

        if (hours >= 24) {
            const opVotes = (allVotes || []).filter(v => v.operation_id === op.id);
            const approves = opVotes.filter(v => v.vote_type === 'approve').length;
            const rejects = opVotes.filter(v => v.vote_type === 'reject').length;

            const newStatus = approves > rejects ? 'approved' : 'rejected';
            await supabase.from('operations').update({ status: newStatus }).eq('id', op.id);
        }
    }
};

export const deleteOperation = async (id) => {
    // Delete associated votes first to avoid foreign key constraints
    await supabase.from('votes').delete().eq('operation_id', id);
    const { error } = await supabase.from('operations').delete().eq('id', id);
    if (error) {
        console.error('Error deleting operation:', error);
        throw error;
    }
};
