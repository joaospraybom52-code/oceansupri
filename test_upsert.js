const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend testing
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    // First, let's select an existing one to update
    const { data: existing } = await supabase.from('medicao_itens').select('id, medicao_id, item_id').limit(1).single()
    if (!existing) return console.log("No existing item")

    const upserts = [
        {
            id: existing.id,
            medicao_id: existing.medicao_id,
            item_id: existing.item_id,
            quantidade_medida: 2,
            valor_medido: 200,
            percentual_medido: 50
        }
    ]

    const { data, error } = await supabase.from('medicao_itens').upsert(upserts)
    if (error) {
        console.error("UPSERT ERROR:", error)
    } else {
        console.log("SUCCESS UPDATE:", data)
    }
}

run()
