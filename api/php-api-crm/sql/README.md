Instruções para definir smtp_from na tabela configuracoes

1) Verifique se o PostgreSQL está rodando.
2) Execute o script SQL no terminal (por exemplo, PowerShell ou CMD):

# Abra um terminal e execute:
psql -U postgres -d crm_imoveis -f set_smtp_from.sql

# Se necessário, informe host/porta e senha via ambiente PGPASSWORD:
PGPASSWORD="sua_senha" psql -h localhost -p 5432 -U postgres -d crm_imoveis -f set_smtp_from.sql

3) Confirme no banco:

psql -U postgres -d crm_imoveis -c "SELECT chave, valor FROM configuracoes WHERE chave = 'smtp_from';"

Observação: ajuste usuário/senha/host/porta conforme seu ambiente.
