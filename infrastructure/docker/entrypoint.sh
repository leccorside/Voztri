#!/bin/sh
set -e

cd /var/www/html

# Apenas o contêiner "app" instala dependências (COMPOSER_INSTALL=true).
# Worker e Reverb compartilham o mesmo diretório montado e só aguardam o
# vendor ficar pronto; rodar composer nos três ao mesmo tempo corrompia o
# vendor e derrubava os contêineres em loop.
if [ "${COMPOSER_INSTALL:-false}" = "true" ]; then
    if [ ! -f "vendor/autoload.php" ] || [ "composer.lock" -nt "vendor/autoload.php" ]; then
        echo "Instalando dependencias do Composer..."
        if [ -f "composer.lock" ]; then
            composer install --no-interaction --prefer-dist --optimize-autoloader
        else
            composer update --no-interaction --prefer-dist --optimize-autoloader
        fi
    fi
else
    tentativas=0
    until [ -f "vendor/autoload.php" ]; do
        if [ "$tentativas" -ge 120 ]; then
            echo "vendor/autoload.php nao apareceu apos 10 minutos; abortando." >&2
            exit 1
        fi
        echo "Aguardando o contêiner app instalar as dependencias do Composer..."
        tentativas=$((tentativas + 1))
        sleep 5
    done
fi

# Garante os diretórios graváveis do Laravel (o storage/ é montado do host)
mkdir -p storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs bootstrap/cache

# O PHP-FPM roda como www-data, mas artisan, tinker, worker e scheduler rodam como
# root: o log criado por eles (644, dono root) não aceitava escrita do FPM, e qualquer
# pedido da API que registrasse algo virava erro 500 ("Permission denied").
touch storage/logs/laravel.log
chmod 666 storage/logs/laravel.log 2>/dev/null || true

# Cria arquivo sqlite para testes/fallback se necessário
touch database/database.sqlite 2>/dev/null || true

# Executa o comando passado para o container
exec "$@"
