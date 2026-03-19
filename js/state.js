// js/state.js
import { supabase } from './supabase.js';

export const getState = async () => {
    const { data: balanceData } = await supabase.from('fund_balance').select('amount').single();
    const { data: operations } = await supabase.from('operations').select('*').order('created_at', { ascending: false });
    const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });

    return {
        balance: balanceData?.amount || 0,
        operations: operations || [],
        transactions: transactions || []
    };
};

export const addOperation = async (operation) => {
    const { data, error } = await supabase.from('operations').insert([{
        ...operation,
        status: 'pending',
        votes_approve: 0,
        votes_reject: 0
    }]).select();
    
    if (error) console.error('Error adding operation:', error);
    return data?.[0];
};

export const voteOperation = async (id, type) => {
    const column = type === 'approve' ? 'votes_approve' : 'votes_reject';
    
    // First get current votes
    const { data: op } = await supabase.from('operations').select(column).eq('id', id).single();
    
    if (op) {
        const { error } = await supabase.from('operations')
            .update({ [column]: op[column] + 1 })
            .eq('id', id);
            
        if (error) console.error('Error voting:', error);
    }
};

export const completeOperation = async (id) => {
    // 1. Get operation details
    const { data: op } = await supabase.from('operations').select('*').eq('id', id).single();
    if (!op || op.status !== 'approved') return;

    // 2. Transactionally (simulated) update balance and create movement
    const { data: balanceData } = await supabase.from('fund_balance').select('amount').single();
    const newBalance = (balanceData?.amount || 0) - op.cost;

    await supabase.from('fund_balance').update({ amount: newBalance }).eq('id', (await supabase.from('fund_balance').select('id').single()).data.id);
    
    await supabase.from('transactions').insert([{
        type: 'out',
        description: op.title,
        amount: op.cost
    }]);

    await supabase.from('operations').update({ status: 'completed' }).eq('id', id);
};

export const checkOperationsStatus = async () => {
    const { data: pendingOps } = await supabase.from('operations').select('*').eq('status', 'pending');
    if (!pendingOps) return;

    const now = new Date();
    for (const op of pendingOps) {
        const created = new Date(op.created_at);
        const diff = now - created;
        const hours = diff / (1000 * 60 * 60);

        if (hours >= 24) {
            const newStatus = op.votes_approve > op.votes_reject ? 'approved' : 'rejected';
            await supabase.from('operations').update({ status: newStatus }).eq('id', op.id);
        }
    }
};
