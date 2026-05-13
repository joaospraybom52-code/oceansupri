import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clean() {
    // 15 minutos atras
    const timeLimit = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    
    console.log(`Deletando todos os pedidos criados depois de ${timeLimit}`);
    
    const { data, error } = await supabase
        .from('pedidos_compra')
        .delete()
        .gte('created_at', timeLimit)
        .select();
        
    if (error) {
        console.error('Erro:', error);
    } else {
        console.log(`Deletados ${data?.length || 0} pedidos. Eles serao re-sincronizados caso sejam validos no proximo tick.`);
    }
}

clean();
