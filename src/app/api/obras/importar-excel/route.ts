import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import * as xlsx from 'xlsx'

// Normaliza cabeçalho: minúsculo, sem acento, pontuação/espaços colapsados
const norm = (s: unknown) =>
    String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[.\s]+/g, ' ')
        .trim()

// Converte número aceitando formato BR ("1.886,82") ou número puro
function parseNum(v: unknown): number {
    if (v == null || v === '') return 0
    if (typeof v === 'number') return isNaN(v) ? 0 : v
    let s = String(v).trim().replace(/\s/g, '')
    if (s === '') return 0
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
    else if (s.includes(',')) s = s.replace(',', '.')
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
}

const vazio = (v: unknown) => v == null || String(v).trim() === ''

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const nome = formData.get('nome') as string
        const codigoUau = (formData.get('codigoUau') as string) || null
        const local = (formData.get('local') as string) || null
        const previsaoInicio = (formData.get('previsaoInicio') as string) || null
        const previsaoTermino = (formData.get('previsaoTermino') as string) || null
        const file = formData.get('file') as File

        if (!nome || !file) {
            return NextResponse.json({ error: 'Nome e arquivo são obrigatórios.' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

        const buffer = Buffer.from(await file.arrayBuffer())
        const workbook = xlsx.read(buffer, { type: 'buffer' })
        if (!workbook.SheetNames.length) return NextResponse.json({ error: 'Planilha vazia.' }, { status: 400 })

        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
        if (rows.length === 0) return NextResponse.json({ error: 'Nenhum dado encontrado na planilha.' }, { status: 400 })

        // Mapeia as colunas pelos cabeçalhos (uma vez, a partir da 1ª linha)
        const keys = Object.keys(rows[0])
        const achaKey = (pred: (nk: string) => boolean) => keys.find(k => pred(norm(k)))
        const kItem = achaKey(nk => nk === 'item' || nk === 'cod' || nk.startsWith('codigo'))
        const kDesc = achaKey(nk => nk.startsWith('descri') || nk.startsWith('servico'))
        const kUnid = achaKey(nk => nk === 'un' || nk === 'unid' || nk === 'unidade')
        const kQtd = achaKey(nk => nk.startsWith('quant') || nk === 'qtde' || nk === 'qtd')
        const kUnit = achaKey(nk => nk.includes('preco') || nk.includes('unit') || nk.includes('vl un') || nk.includes('valor un'))
        const kTotal = achaKey(nk => nk === 'total' || nk.includes('vl total') || nk.includes('valor total') || (nk.includes('total') && !nk.includes('item')))
        const kPeso = achaKey(nk => nk.includes('peso') || nk === '%')

        if (!kItem && !kDesc) {
            return NextResponse.json({ error: 'Não encontrei as colunas (Item/Descrição). Use o modelo de importação.' }, { status: 400 })
        }

        // Criar Obra
        const { data: obra, error: obraError } = await supabase
            .from('obras_eng')
            .insert({ nome, status: 'Ativa', codigo_uau: codigoUau, local, previsao_inicio: previsaoInicio, previsao_termino: previsaoTermino })
            .select('id')
            .single()
        if (obraError || !obra) {
            return NextResponse.json({ error: 'Erro ao criar obra no banco de dados.' }, { status: 500 })
        }
        const obraId = obra.id

        let totalPlanilha = 0
        const itens = rows
            .map(row => {
                const item = kItem ? row[kItem] : null
                const desc = kDesc ? row[kDesc] : null
                if (vazio(item) && vazio(desc)) return null // linha em branco

                const unidRaw = kUnid ? row[kUnid] : null
                const qtdRaw = kQtd ? row[kQtd] : null
                const ehPai = vazio(unidRaw) && vazio(qtdRaw)

                const valorTotal = kTotal ? parseNum(row[kTotal]) : 0
                totalPlanilha += valorTotal

                return {
                    obra_id: obraId,
                    codigo: vazio(item) ? '' : String(item).trim(),
                    descricao: vazio(desc) ? '' : String(desc).trim(),
                    unidade: vazio(unidRaw) ? null : String(unidRaw).trim(),
                    quantidade_orcada: parseNum(qtdRaw),
                    valor_unitario_orcado: kUnit ? parseNum(row[kUnit]) : 0,
                    valor_total_orcado: valorTotal,
                    peso_percentual: kPeso ? parseNum(row[kPeso]) : 0,
                    eh_pai: ehPai,
                }
            })
            .filter((i): i is NonNullable<typeof i> => i !== null)

        if (itens.length === 0) {
            await supabase.from('obras_eng').delete().eq('id', obraId)
            return NextResponse.json({ error: 'Não foi possível encontrar itens na planilha.' }, { status: 400 })
        }

        const { error: itemsError } = await supabase.from('itens_orcamento').insert(itens)
        if (itemsError) {
            await supabase.from('obras_eng').delete().eq('id', obraId)
            return NextResponse.json({ error: 'Erro ao salvar itens: ' + itemsError.message }, { status: 500 })
        }

        const totalCadastrado = itens.reduce((s, i) => s + i.valor_total_orcado, 0)
        const confere = Math.abs(totalPlanilha - totalCadastrado) < 0.01

        return NextResponse.json({
            success: true,
            obra_id: obraId,
            items_count: itens.length,
            total_planilha: totalPlanilha,
            total_cadastrado: totalCadastrado,
            confere,
        })
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
