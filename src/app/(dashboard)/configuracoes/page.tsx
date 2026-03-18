export default function ConfiguracoesPage() {
    return (
        <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Configurações</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Configurações do sistema e integração com ERP
            </p>

            <div className="glass-card" style={{ padding: '24px', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Integração ERP UAU (Opcional)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                    A integração com o ERP UAU pode ser habilitada para sincronizar automaticamente pedidos de compra.
                    Para habilitar, configure as credenciais de acesso à API do UAU fornecidas pela Globaltec.
                </p>
                <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '12px', color: 'var(--accent-blue-light)' }}>
                    ℹ️ Funcionalidade disponível em versão futura. Os dados atualmente são inseridos manualmente pelos compradores.
                </div>
            </div>
        </div>
    )
}
