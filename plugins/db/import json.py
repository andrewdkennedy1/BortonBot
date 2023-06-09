import json

# Load commands data from commands.json
with open('commands.json', 'r') as commands_file:
    commands_data = json.load(commands_file)

# Load descriptions data from descriptions.json
with open('descriptions.json', 'r') as descriptions_file:
    descriptions_data = json.load(descriptions_file)

# Create a dictionary to map command names to descriptions
descriptions_map = {description['name']: description['description'] for description in descriptions_data}

# Update the 'description' field in each command with the corresponding description
for command in commands_data:
    command_name = command['name']
    if command_name in descriptions_map:
        command['description'] = descriptions_map[command_name]

# Save the updated commands data to commands.json
with open('commands.json', 'w') as commands_file:
    json.dump(commands_data, commands_file, indent=2)
