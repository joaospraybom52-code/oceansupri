import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanDuplicates() {
    console.log('Buscando todas as obras...');
    const { data: obras, error } = await supabase
        .from('obras')
        .select('id, codigo, created_at')
        .order('created_at', { ascending: true });

    if (error || !obras) {
        console.error('Erro ao buscar obras:', error);
        return;
    }

    const byCodigo: Record<string, any[]> = {};
    for (const ob of obras) {
        if (!ob.codigo) continue;
        const cod = ob.codigo.toUpperCase().trim();
        if (!byCodigo[cod]) byCodigo[cod] = [];
        byCodigo[cod].push(ob);
    }

    let deletedCount = 0;
    let updatedPedidos = 0;

    for (const [codigo, list] of Object.entries(byCodigo)) {
        if (list.length > 1) {
            console.log(`\nCódigo duplicado: ${codigo} (${list.length} registros)`);
            const principal = list[0];
            const duplicadas = list.slice(1);

            for (const dup of duplicadas) {
                // Transferir pedidos_compra
                const { data: pedidos } = await supabase
                    .from('pedidos_compra')
                    .select('id')
                    .eq('obra_id', dup.id);
                
                if (pedidos && pedidos.length > 0) {
                    const { error: updErr } = await supabase
                        .from('pedidos_compra')
                        .update({ obra_id: principal.id })
                        .eq('obra_id', dup.id);
                    if (!updErr) updatedPedidos += pedidos.length;
                }

                // Deletar a obra duplicada
                const { error: delErr } = await supabase
                    .from('obras')
                    .delete()
                    .eq('id', dup.id);
                if (!delErr) {
                    deletedCount++;
                } else {
                    console.error(`Erro ao deletar obra ${dup.id}:`, delErr);
                }
            }
        }
    }

    console.log(`\nLimpeza concluída!`);
    console.log(`Obras duplicadas deletadas: ${deletedCount}`);
    console.log(`Pedidos atualizados: ${updatedPedidos}`);
}

cleanDuplicates();
