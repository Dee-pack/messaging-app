get_token() {
  curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token'
}
