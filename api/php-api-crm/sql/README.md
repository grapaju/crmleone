Instruções para definir smtp_from na tabela configuracoes

1) Verifique se o MySQL está rodando (XAMPP).
2) Execute o script SQL no terminal (por exemplo, PowerShell ou CMD):

# Abra um terminal e execute:
mysql -u root crm_imoveis < set_smtp_from.sql

# Se seu MySQL usa senha para root, use:
mysql -u root -p crm_imoveis < set_smtp_from.sql

3) Confirme no banco:

mysql -u root -e "SELECT chave, valor FROM crm_imoveis.configuracoes WHERE chave = 'smtp_from';"

Observação: ajuste usuário/senha conforme sua instalação local.
