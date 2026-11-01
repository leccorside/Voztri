#!/bin/sh
set -e

cd /var/www/html

# Instala dependências do Composer se o diretório vendor não existir
if [ ! -f "vendor/autoload.php" ]; then
    echo "Instalando dependencias do Composer..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Cria arquivo sqlite para testes/fallback se necessário
touch /var/www/html/database/database.sqlite 2>/dev/null || true

# Executa o comando passado para o container
exec "$@"

