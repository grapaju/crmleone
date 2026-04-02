-- Migration: permitir property_id NULL em property_images
-- Execute no banco `crm_imoveis` para permitir que imagens vinculadas apenas a projetos sejam salvas

ALTER TABLE property_images
  MODIFY property_id INT(11) DEFAULT NULL;

-- Verifique se o esquema foi atualizado:
-- SHOW CREATE TABLE property_images;
