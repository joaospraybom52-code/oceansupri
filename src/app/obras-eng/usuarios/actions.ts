'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import { perfilPorId, type Perfil } from '@/lib/utils/perfis-acesso'

// =============================================================================
// Ações do cadastro de usuários. Tudo aqui roda no servidor com a SERVICE ROLE,
// que é a única chave capaz de criar login e bloquear acesso no Supabase Auth.
//
// Toda ação confere ANTES se quem chamou é admin do módulo Obras. Esconder o
// link no menu é vitrine; a fechadura é esta.
// =============================================================================

type Resultado = { ok: true; msg: string } | { ok: false; erro: string }

/** Ban "eterno" do Supabase: 100 anos em horas. */
const BLOQUEIO = '876000h'

function admin() {
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!chave) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada no ambiente. '
            + 'Sem ela o app não cria nem bloqueia login. Adicione a variável no projeto da Vercel e publique de novo.')
    }
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

/** Email do admin logado — ou null se quem chamou não for admin. */
async function quemChamou(): Promise<string | null> {
    if (!podeAdminObra(await getPapelObras())) return null
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email ?? null
}

/**
 * Escreve o perfil nas tabelas que o middleware consulta. Sempre limpa antes de
 * gravar: trocar de perfil não pode deixar resto do perfil anterior.
 */
async function aplicarPermissoes(email: string, perfil: Perfil | null, nome: string) {
    const db = admin()
    const alvo = email.toLowerCase().trim()

    await Promise.all([
        db.from('permissoes_obras').delete().eq('email', alvo),
        db.from('permissao_modulocontrole').delete().eq('email', alvo),
        db.from('visualizadores').delete().eq('email', alvo),
    ])

    if (!perfil) return // desativado: fica sem nenhuma permissão

    const escritas: PromiseLike<unknown>[] = []
    if (perfil.obras) {
        escritas.push(db.from('permissoes_obras').insert({ email: alvo, papel: perfil.obras }))
    }
    if (perfil.controle) {
        escritas.push(db.from('permissao_modulocontrole').insert({ email: alvo, pode_editar: perfil.controle.editar }))
    }
    if (perfil.suprimentos === 'board') {
        escritas.push(db.from('visualizadores').insert({ email: alvo, nome, ativo: true }))
    }
    await Promise.all(escritas)
}

export async function criarUsuario(form: { nome: string; email: string; senha: string; perfil: string; observacoes?: string }): Promise<Resultado> {
    const autor = await quemChamou()
    if (!autor) return { ok: false, erro: 'Só o administrador do módulo Obras pode cadastrar usuários.' }

    const nome = form.nome.trim()
    const email = form.email.trim().toLowerCase()
    const perfil = perfilPorId(form.perfil)
    if (!nome || !email || !form.senha) return { ok: false, erro: 'Preencha nome, e-mail e senha.' }
    if (!perfil) return { ok: false, erro: 'Escolha um nível de acesso.' }
    if (form.senha.length < 6) return { ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' }

    try {
        const db = admin()

        const { data: jaExiste } = await db.from('usuarios_app').select('id, ativo').eq('email', email).maybeSingle()
        if (jaExiste) {
            return { ok: false, erro: (jaExiste as { ativo: boolean }).ativo
                ? 'Já existe usuário com esse e-mail.'
                : 'Esse e-mail já foi cadastrado e está desativado. Use o botão Reativar na lista.' }
        }

        // email_confirm: a senha é definida aqui, então não há convite a confirmar.
        const { data: criado, error: erroAuth } = await db.auth.admin.createUser({
            email, password: form.senha, email_confirm: true, user_metadata: { nome },
        })
        if (erroAuth) {
            const jaNoAuth = /already|registered|exists/i.test(erroAuth.message)
            return { ok: false, erro: jaNoAuth
                ? 'Esse e-mail já tem login no sistema. Cadastre com outro e-mail ou me peça para vincular o login existente.'
                : 'Erro ao criar o login: ' + erroAuth.message }
        }

        const { error: erroReg } = await db.from('usuarios_app').insert({
            nome, email, perfil: perfil.id, ativo: true,
            auth_user_id: criado.user?.id ?? null,
            observacoes: form.observacoes?.trim() || null,
            criado_por: autor,
        })
        if (erroReg) return { ok: false, erro: 'Login criado, mas falhou ao gravar o cadastro: ' + erroReg.message }

        await aplicarPermissoes(email, perfil, nome)
        return { ok: true, msg: `Usuário ${nome} cadastrado com o perfil ${perfil.nome}.` }
    } catch (e) {
        return { ok: false, erro: (e as Error).message }
    }
}

export async function alterarPerfil(id: string, novoPerfil: string): Promise<Resultado> {
    const autor = await quemChamou()
    if (!autor) return { ok: false, erro: 'Só o administrador do módulo Obras pode alterar acessos.' }
    const perfil = perfilPorId(novoPerfil)
    if (!perfil) return { ok: false, erro: 'Nível de acesso inválido.' }

    try {
        const db = admin()
        const { data: u } = await db.from('usuarios_app').select('email, nome, ativo').eq('id', id).maybeSingle()
        if (!u) return { ok: false, erro: 'Usuário não encontrado.' }
        const usuario = u as { email: string; nome: string; ativo: boolean }

        await db.from('usuarios_app').update({ perfil: perfil.id }).eq('id', id)
        if (usuario.ativo) await aplicarPermissoes(usuario.email, perfil, usuario.nome)
        return { ok: true, msg: `${usuario.nome} agora é ${perfil.nome}.` }
    } catch (e) {
        return { ok: false, erro: (e as Error).message }
    }
}

/**
 * Desativa: bloqueia o login, retira todas as permissões e marca a linha como
 * inativa. Nada do que a pessoa fez é apagado — lançamentos, medições e
 * cadastros continuam no banco com o histórico de quem fez.
 */
export async function desativarUsuario(id: string): Promise<Resultado> {
    const autor = await quemChamou()
    if (!autor) return { ok: false, erro: 'Só o administrador do módulo Obras pode desativar usuários.' }

    try {
        const db = admin()
        const { data: u } = await db.from('usuarios_app').select('email, nome, auth_user_id').eq('id', id).maybeSingle()
        if (!u) return { ok: false, erro: 'Usuário não encontrado.' }
        const usuario = u as { email: string; nome: string; auth_user_id: string | null }
        if (usuario.email === autor) return { ok: false, erro: 'Você não pode desativar o seu próprio acesso.' }

        await aplicarPermissoes(usuario.email, null, usuario.nome)
        if (usuario.auth_user_id) {
            const { error } = await db.auth.admin.updateUserById(usuario.auth_user_id, { ban_duration: BLOQUEIO })
            if (error) return { ok: false, erro: 'Permissões retiradas, mas o login não foi bloqueado: ' + error.message }
        }
        await db.from('usuarios_app').update({ ativo: false, desativado_por: autor, desativado_em: new Date().toISOString() }).eq('id', id)
        return { ok: true, msg: `${usuario.nome} foi desativado. O histórico dele continua no sistema.` }
    } catch (e) {
        return { ok: false, erro: (e as Error).message }
    }
}

export async function reativarUsuario(id: string): Promise<Resultado> {
    const autor = await quemChamou()
    if (!autor) return { ok: false, erro: 'Só o administrador do módulo Obras pode reativar usuários.' }

    try {
        const db = admin()
        const { data: u } = await db.from('usuarios_app').select('email, nome, perfil, auth_user_id').eq('id', id).maybeSingle()
        if (!u) return { ok: false, erro: 'Usuário não encontrado.' }
        const usuario = u as { email: string; nome: string; perfil: string; auth_user_id: string | null }
        const perfil = perfilPorId(usuario.perfil)

        if (usuario.auth_user_id) {
            const { error } = await db.auth.admin.updateUserById(usuario.auth_user_id, { ban_duration: 'none' })
            if (error) return { ok: false, erro: 'Erro ao desbloquear o login: ' + error.message }
        }
        await aplicarPermissoes(usuario.email, perfil, usuario.nome)
        await db.from('usuarios_app').update({ ativo: true, desativado_por: null, desativado_em: null }).eq('id', id)
        return { ok: true, msg: `${usuario.nome} voltou a ter acesso${perfil ? ` como ${perfil.nome}` : ''}.` }
    } catch (e) {
        return { ok: false, erro: (e as Error).message }
    }
}

export async function redefinirSenha(id: string, senha: string): Promise<Resultado> {
    const autor = await quemChamou()
    if (!autor) return { ok: false, erro: 'Só o administrador do módulo Obras pode trocar senhas.' }
    if (!senha || senha.length < 6) return { ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' }

    try {
        const db = admin()
        const { data: u } = await db.from('usuarios_app').select('nome, auth_user_id').eq('id', id).maybeSingle()
        const usuario = u as { nome: string; auth_user_id: string | null } | null
        if (!usuario?.auth_user_id) return { ok: false, erro: 'Usuário sem login vinculado.' }

        const { error } = await db.auth.admin.updateUserById(usuario.auth_user_id, { password: senha })
        if (error) return { ok: false, erro: 'Erro ao trocar a senha: ' + error.message }
        return { ok: true, msg: `Senha de ${usuario.nome} atualizada.` }
    } catch (e) {
        return { ok: false, erro: (e as Error).message }
    }
}
