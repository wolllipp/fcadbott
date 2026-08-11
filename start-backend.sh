#!/bin/bash
echo '=== Starting Backend ==='
for i in $(seq 1 60); do
    if docker exec fkp-ss-app-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
        /root/fcadbott/fkp-ss-app/heal-db.sh
        echo 'DB OK. Starting backend...'
        cd /root/fcadbott/fkp-ss-app/backend
        exec npm start
    fi
    sleep 2
done
echo 'DB not ready!'
exit 1
