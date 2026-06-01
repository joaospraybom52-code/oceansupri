import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data: d1 } = await supabase.from('pedidos_compra').select('id').not('data_ordem_compra', 'is', null)
    const { data: d2 } = await supabase.from('pedidos_compra').select('id').not('data_entrega_real', 'is', null)
    
    console.log(`Total com Ordem de Compra: ${d1?.length}`)
    console.log(`Total com Entrega Real: ${d2?.length}`)
}

check()
