
import os

dashboard_path = 'src/app/dashboard/page.js'
new_analytics_path = 'src/app/dashboard/new_analytics.js'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(new_analytics_path, 'r', encoding='utf-8') as f:
    new_analytics_lines = f.readlines()

start_marker = "        {selectedOption === 'analytics' && user.type === 'admin' && ("
next_block_marker = "        {selectedOption === 'inventory' && user.type === 'admin' && ("

new_lines = []
skipping = False
inserted = False

for line in lines:
    if start_marker in line:
        skipping = True
        # Insert new content here
        new_lines.extend(new_analytics_lines)
        new_lines.append('\n') # Ensure spacing
        inserted = True
    
    if skipping:
        if next_block_marker in line:
            skipping = False
            new_lines.append(line)
    else:
        new_lines.append(line)

if not inserted:
    print("Error: Could not find analytics block start marker")
    exit(1)

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated dashboard page.js")
