-- Atualiza ou insere a chave smtp_from na tabela configuracoes
-- Use: mysql -u root -p crm_imoveis < set_smtp_from.sql

INSERT INTO configuracoes (chave, valor)
SELECT 'smtp_from', 'imoveis@simplifique.click'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM configuracoes WHERE chave = 'smtp_from');

UPDATE configuracoes
SET valor = 'imoveis@simplifique.click'
WHERE chave = 'smtp_from';
