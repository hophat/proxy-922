#!/bin/bash

# Script để kiểm tra và kill các queries đang block migration

DATABASE_HOST=${DATABASE_HOST:-localhost}
DATABASE_PORT=${DATABASE_PORT:-5432}
DATABASE_NAME=${DATABASE_NAME:-Proxy96}
DATABASE_USER=${DATABASE_USER:-proxyadmin}

echo "🔍 Kiểm tra các queries đang lock bảng..."

# Hiển thị các queries đang chạy lâu và có thể block migration
psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" <<EOF
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;
EOF

echo ""
echo "🔒 Kiểm tra locks trên các bảng liên quan..."

psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" <<EOF
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application,
    blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND (
    blocked_activity.query ILIKE '%user_proxy_purchases%' OR
    blocked_activity.query ILIKE '%payment_orders%' OR
    blocking_activity.query ILIKE '%user_proxy_purchases%' OR
    blocking_activity.query ILIKE '%payment_orders%'
  );
EOF

echo ""
echo "💡 Để kill một query đang block, chạy:"
echo "   SELECT pg_terminate_backend(<blocking_pid>);"
echo ""
echo "⚠️  Hoặc kill tất cả queries đang chạy lâu (CẨN THẬN!):"
echo "   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND (now() - query_start) > interval '30 seconds' AND pid != pg_backend_pid();"
