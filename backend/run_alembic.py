import os
from alembic import command
from alembic.config import Config

# Load .env manually
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k, v)

alembic_cfg = Config(os.path.join(os.path.dirname(__file__), 'alembic.ini'))
# Ensure script location is correct
alembic_cfg.set_main_option('script_location', os.path.join(os.path.dirname(__file__), 'alembic'))

print('Using DATABASE_URL=', os.environ.get('DATABASE_URL'))
command.upgrade(alembic_cfg, 'head')
print('Alembic upgrade completed')
