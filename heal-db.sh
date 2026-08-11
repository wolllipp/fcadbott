#!/bin/bash
cd /root/fcadbott/fkp-ss-app

# 1. Проверяем доступность сервиса
if ! docker exec fkp-ss-app-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
    echo '[HEAL] DB service not ready, waiting...'
    exit 1
fi

# 2. Проверяем, существует ли база данных
DB_EXISTS=$(docker exec fkp-ss-app-postgres-1 psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='fkp_ss'")

if [ "$DB_EXISTS" != "1" ]; then
    echo '[HEAL] Database fkp_ss is missing! Creating...'
    docker exec fkp-ss-app-postgres-1 psql -U postgres -c "CREATE DATABASE fkp_ss;"
    
    cd backend
    echo '[HEAL] Applying migrations...'
    npx prisma migrate deploy
    
    echo '[HEAL] Seeding initial data...'
    npm run db:seed
else
    # 3. База есть. Проверяем, работает ли подключение (пароль)
    # Пробуем сделать простой запрос. Если ошибка пароля - фиксим.
    PASS_OK=$(docker exec fkp-ss-app-postgres-1 psql -U postgres -d fkp_ss -c 'SELECT 1' 2>&1)
    if [[ "$PASS_OK" == *"authentication failed"* ]]; then
        echo '[HEAL] Password mismatch! Fixing...'
        docker exec fkp-ss-app-postgres-1 psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'password';"
    fi

    # Проверяем, загружены ли справочники (координаторы). Если нет - делаем сид.
    COUNT=$(docker exec fkp-ss-app-postgres-1 psql -U postgres -d fkp_ss -tAc "SELECT count(*) FROM \"Coordinator\"" 2>/dev/null)
    if [ "$COUNT" == "0" ] || [ -z "$COUNT" ]; then
        echo '[HEAL] Database empty! Seeding...'
        cd backend
        npx prisma migrate deploy
        npm run db:seed
    fi
fi

# Финальная гарантия пароля
docker exec fkp-ss-app-postgres-1 psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'password';" > /dev/null 2>&1
