#!/bin/bash

# Generate new password hash using the project's hash_password function
echo 'Generating new password hash...'
python3 << PYEOF
import sys
sys.path.insert(0, '/app')

from app.core.security import hash_password

print(hash_password('Management123!'))
PYEOF > /tmp/new_hash.txt

# Read the generated hash
NEW_HASH=

echo 