import sys

def resolve_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We will just print if we find conflict markers
    if '<<<<<<<' in content:
        print(f"File {filepath} has conflicts")

resolve_file('mobile/app/(auth)/sign-in.tsx')
