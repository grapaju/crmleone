-- Atualiza ou insere a chave smtp_from na tabela configuracoes
-- Use: psql -U postgres -d crm_imoveis -f set_smtp_from.sql

INSERT INTO configuracoes (chave, valor)
SELECT 'smtp_from', 'imoveis@simplifique.click'
WHERE NOT EXISTS (SELECT 1 FROM configuracoes WHERE chave = 'smtp_from');

UPDATE configuracoes
SET valor = 'imoveis@simplifique.click'
WHERE chave = 'smtp_from';
