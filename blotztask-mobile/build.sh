#!/bin/bash

platforms=("ios" "android")
profiles=("development" "preview" "production")
android_build_types=("App Bundle" "APK")
bump_types=("Major (+1.0.0)" "Minor (x.+1.0)" "Patch (x.x.+1)")

select_option() {
    local title="$1"
    shift
    local options=("$@")
    echo "" >&2
    echo "$title" >&2
    for i in "${!options[@]}"; do
        echo "  [$((i + 1))] ${options[$i]}" >&2
    done
    while true; do
        read -p "Enter number: " input
        if [[ "$input" =~ ^[0-9]+$ ]] && (( input >= 1 && input <= ${#options[@]} )); then
            echo "${options[$((input - 1))]}"
            return
        fi
        echo "Invalid input, try again." >&2
    done
}

cleanup() {
    if [[ -f eas.json.bak ]]; then
        mv eas.json.bak eas.json
    fi
}
trap cleanup EXIT

platform=$(select_option "Select platform:" "${platforms[@]}")
profile=$(select_option "Select profile:" "${profiles[@]}")

# Read current version for the selected profile
current_version=$(python3 -c "
import json
with open('eas.json') as f:
    data = json.load(f)
print(data['build']['$profile']['env']['APP_VERSION'])
")

echo "" >&2
echo "Current version ($profile): $current_version" >&2

bump=$(select_option "Select version bump:" "${bump_types[@]}")

new_version=$(python3 -c "
parts = '$current_version'.split('.')
major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
if 'Major' in '$bump':
    major += 1; minor = 0; patch = 0
elif 'Minor' in '$bump':
    minor += 1; patch = 0
else:
    patch += 1
print(f'{major}.{minor}.{patch}')
")

echo "  $current_version  →  $new_version" >&2

# Permanently update APP_VERSION in eas.json for the selected profile
python3 - <<EOF
import json
with open('eas.json') as f:
    data = json.load(f)
data['build']['$profile']['env']['APP_VERSION'] = '$new_version'
with open('eas.json', 'w') as f:
    json.dump(data, f, indent=2)
EOF

# Android: ask build type and temporarily patch eas.json (restored on exit)
if [[ "$platform" == "android" ]]; then
    build_type_label=$(select_option "Select Android build type:" "${android_build_types[@]}")
    if [[ "$build_type_label" == "APK" ]]; then
        android_build_type="apk"
    else
        android_build_type="app-bundle"
    fi

    cp eas.json eas.json.bak
    python3 - <<EOF2
import json
with open('eas.json') as f:
    data = json.load(f)
data['build']['$profile'].setdefault('android', {})['buildType'] = '$android_build_type'
with open('eas.json', 'w') as f:
    json.dump(data, f, indent=2)
EOF2
fi

cmd="eas build --platform $platform --profile $profile --non-interactive --local"

echo ""
echo "Running: $cmd"
eval "$cmd"
