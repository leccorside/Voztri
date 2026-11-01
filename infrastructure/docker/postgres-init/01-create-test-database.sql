-- Executado pelo entrypoint oficial do Postgres apenas na criação do volume.
-- Cria o banco usado pela suíte de testes (backend/phpunit.xml), isolado do
-- banco de desenvolvimento, já com as extensões exigidas pelas migrations.
CREATE DATABASE voztri_test OWNER voztri_user;

\connect voztri_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
