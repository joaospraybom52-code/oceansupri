import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import * as xlsx from 'xlsx'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const nome = formData.get('nome') as string
        const file = formData.get('file') as File

        if (!nome || !file) {
            return NextResponse.json({ error: 'Nome e arquivo são obrigatórios.' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        // Ler arquivo Excel
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const workbook = xlsx.read(buffer, { type: 'buffer' })

        if (!workbook.SheetNames.length) {
            return NextResponse.json({ error: 'Planilha vazia.' }, { status: 400 })
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = xlsx.utils.sheet_to_json<any>(firstSheet, { defval: null })

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Nenhum dado encontrado na planilha.' }, { status: 400 })
        }

        // Criar Obra
        const { data: obra, error: obraError } = await supabase
            .from('obras_eng')
            .insert({
                nome: nome,
                status: 'Ativa',
            })
            .select('id')
            .single()

        if (obraError || !obra) {
            return NextResponse.json({ error: 'Erro ao criar obra no banco de dados.' }, { status: 500 })
        }

        const obraId = obra.id

        // Normalizar e extrair itens
        // Dependendo de como a planilha vem, precisamos encontrar as colunas certas.
        // Vamos buscar palavras-chave para mapear as colunas
        
        const mapItem = (row: any) => {
            // Keys podem ter variações, ex: "Código", "Cod", "Descrição", "Desc", "Qtde", "Quantidade", etc
            const keys = Object.keys(row)
            const getVal = (possibleKeys: string[]) => {
                for (const pk of possibleKeys) {
                    const match = keys.find(k => k.toLowerCase().includes(pk.toLowerCase()))
                    if (match && row[match] !== null && row[match] !== undefined) {
                        return row[match]
                    }
                }
                return null
            }

            const codigo = getVal(['cod', 'código', 'item'])?.toString() || 'S/C'
            const descricao = getVal(['desc', 'serviço', 'servico'])?.toString() || 'Sem descrição'
            const unidade = getVal(['unid', 'un'])?.toString() || 'un'
            const quantidade = parseFloat(getVal(['qtde', 'quant'])?.toString() || '0')
            const valorUnit = parseFloat(getVal(['unit', 'unitário', 'valor un'])?.toString() || '0')
            const valorTotal = parseFloat(getVal(['total', 'valor to'])?.toString() || '0')
            const peso = parseFloat(getVal(['peso', '%'])?.toString() || '0')

            return {
                obra_id: obraId,
                codigo: codigo,
                descricao: descricao,
                unidade: unidade,
                quantidade_orcada: isNaN(quantidade) ? 0 : quantidade,
                valor_unitario_orcado: isNaN(valorUnit) ? 0 : valorUnit,
                valor_total_orcado: isNaN(valorTotal) ? 0 : valorTotal,
                peso_percentual: isNaN(peso) ? 0 : peso
            }
        }

        const itemsToInsert = rows.map(mapItem).filter(i => i.descricao !== 'Sem descrição' && i.valor_total_orcado > 0)

        if (itemsToInsert.length === 0) {
            // Se nenhum item foi validado, deleta a obra pra não ficar órfã vazia (opcional)
            await supabase.from('obras_eng').delete().eq('id', obraId)
            return NextResponse.json({ error: 'Não foi possível encontrar itens válidos na planilha.' }, { status: 400 })
        }

        const { error: itemsError } = await supabase
            .from('itens_orcamento')
            .insert(itemsToInsert)

        if (itemsError) {
            // Se falhou inserir os itens, deleta a obra
            await supabase.from('obras_eng').delete().eq('id', obraId)
            return NextResponse.json({ error: 'Erro ao salvar itens no banco de dados: ' + itemsError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, obra_id: obraId, items_count: itemsToInsert.length })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
