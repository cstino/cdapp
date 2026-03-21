import { supabase, adminSupabase } from './supabase.js';

/**
 * Sistema di notifica per CDA App
 * Chiama la Edge Function 'notify-members' su Supabase
 */

export const notifyNewOperation = async (operation) => {
    console.log('Notifica per nuova operazione:', operation.title);

    const { data: profiles } = await adminSupabase.from('profiles').select('email');
    const recipients = profiles?.map(p => p.email) || [];
    if (recipients.length === 0) return;

    await supabase.functions.invoke('notify-members', {
        body: {
            event: 'new_operation',
            title: operation.title,
            proposer: operation.proposer,
            cost: operation.cost,
            recipients: recipients
        }
    });
};

export const notifyOperationCompleted = async (operationId, title, amount) => {
    console.log(`Notifica operazione completata: ${title}`);

    const { data: profiles } = await adminSupabase.from('profiles').select('email');
    const recipients = profiles?.map(p => p.email) || [];
    if (recipients.length === 0) return;

    await supabase.functions.invoke('notify-members', {
        body: {
            event: 'operation_completed',
            title: title,
            amount: amount,
            recipients: recipients
        }
    });
};

export const notifyBalanceUpdated = async (amount, newTotal) => {
    console.log(`Notifica bilancio aggiornato: ${amount}`);

    const { data: profiles } = await adminSupabase.from('profiles').select('email');
    const recipients = profiles?.map(p => p.email) || [];
    if (recipients.length === 0) return;

    await supabase.functions.invoke('notify-members', {
        body: {
            event: 'balance_updated',
            diff: amount,
            total: newTotal,
            recipients: recipients
        }
    });
};
