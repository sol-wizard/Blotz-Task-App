#!/usr/bin/env python3
"""Check local schema, or replace only the four old AI Coach migration history rows.

Default: python3 scripts/reconcile-local-ai-coach-migrations.py
After backing up local SQL: append --apply. Never run database update to do this.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true', help='Replace local migration history after validation')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
migration_id = '20261020112233_CreateAiCoachConversationTables'
checked_id = subprocess.check_output(
    ['bash', str(root / 'scripts/check-v2-migration.sh'), str(root)], text=True
).strip()
if checked_id != migration_id:
    raise SystemExit('Migration ID changed; review the reconciliation SQL before proceeding.')

config = json.loads((root / 'blotztask-api/appsettings.json').read_text())
development = json.loads((root / 'blotztask-api/appsettings.Development.json').read_text())
connection = (
    os.environ.get('ConnectionStrings__DefaultConnection')
    or development.get('ConnectionStrings', {}).get('DefaultConnection')
    or config.get('ConnectionStrings', {}).get('DefaultConnection')
)
if not connection:
    raise SystemExit('Local development connection string is missing.')
# Refuse non-loopback SQL even if an environment override was accidentally set.
parts = dict(part.split('=', 1) for part in connection.split(';') if '=' in part)
normalized = {key.strip().lower(): value.strip() for key, value in parts.items()}
server = next((normalized[key] for key in ('server', 'data source', 'address', 'addr', 'network address') if key in normalized), '')
host = server.lower().removeprefix('tcp:').split(',')[0].split('\\')[0]
if host not in ('localhost', '127.0.0.1', '[::1]', '(local)', '.'):
    raise SystemExit('Refusing reconciliation: the SQL server must be local.')

sql = (root / 'scripts/reconcile-local-ai-coach-migrations.sql').read_text()
if args.apply:
    sql = sql.replace('DECLARE @ApplyChanges bit = 0;', 'DECLARE @ApplyChanges bit = 1;', 1)
env = os.environ.copy()
env['BLOTZ_SQL_CONNECTION_STRING'] = connection
expected_id = migration_id if args.apply else '20260928030534_AddAiCoachFeedbackAndTraceEvents'
with tempfile.TemporaryDirectory(prefix='blotz-local-reconcile-') as temp:
    sql_path = Path(temp) / 'reconcile.sql'
    sql_path.write_text(sql)
    result = subprocess.run([
        'dotnet', 'run', '--project', str(root / 'scripts/v2-sql-runner/V2SqlRunner.csproj'),
        '--configuration', 'Release', '--', str(sql_path), expected_id
    ], env=env, cwd=root)
if result.returncode:
    raise SystemExit(result.returncode)
print('Local migration history reconciled; business tables were not changed.' if args.apply
      else 'Local schema and migration history checks passed. No history rows were changed.')
