import os
import re

frontend_dir = '/home/pranjal-garg/felicity-event-management/frontend/src'
localhost_url = 'http://localhost:5000'

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if localhost_url in content:
        # Avoid fixing api.js itself too much, but let's see
        if 'config/api.js' in filepath:
            return

        # Check if already imported
        has_import = 'import { API_ENDPOINTS }' in content or 'import API_BASE_URL' in content or 'import { API_BASE_URL }' in content
        
        # Replace URLs
        new_content = content.replace(localhost_url, '${API_BASE_URL}')
        
        # We need to make sure API_BASE_URL is defined.
        # It's better to use a consistent import.
        if not has_import:
            # Find relative path to config/api
            rel_path = os.path.relpath(frontend_dir + '/config/api', os.path.dirname(filepath))
            if not rel_path.startswith('.'):
                rel_path = './' + rel_path
            
            import_line = f"import API_BASE_URL from '{rel_path}';\n"
            # Insert after other imports
            lines = new_content.split('\n')
            insert_idx = 0
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    insert_idx = i + 1
            lines.insert(insert_idx, import_line)
            new_content = '\n'.join(lines)
            
        # Fix template strings - content might have 'http://localhost:5000/api/...'
        # which becomes '${API_BASE_URL}/api/...'
        # If it was in a single quote string: 'http://localhost:5000/api/...' -> `${API_BASE_URL}/api/...`
        
        # Handle single quotes: 'http://localhost:5000/...' -> `${API_BASE_URL}/...`
        new_content = re.sub(f"'{re.escape(localhost_url)}([^']*)'", r"`${API_BASE_URL}\1`", new_content)
        # Handle double quotes: "http://localhost:5000/..." -> `${API_BASE_URL}/...`
        new_content = re.sub(f'"{re.escape(localhost_url)}([^"]*)"', r"`${API_BASE_URL}\1`", new_content)

        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            fix_file(os.path.join(root, file))
