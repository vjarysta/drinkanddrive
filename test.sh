find src -type f | while read -r file; do
  ext="${file##*.}"
  case "$ext" in
    js|jsx|ts|tsx)
      printf "\n/* File: %s */\n" "$file"
      ;;
    css|scss|less)
      printf "\n/* File: %s */\n" "$file"
      ;;
    html|htm)
      printf "\n<!-- File: %s -->\n" "$file"
      ;;
    json)
      printf "\n// File: %s\n" "$file"
      ;;
    *)
      printf "\n# File: %s\n" "$file"
      ;;
  esac
  cat "$file"
done
