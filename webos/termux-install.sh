#!/data/data/com.termux/files/usr/bin/env bash
# Instala o Free My TV numa TV LG (webOS) pelo Termux: compila o .ipk no próprio celular,
# com a chave TMDB do usuário, e depois envia para a TV.
#
#   bash webos/termux-install.sh <IP_DA_TV>
#
# A chave TMDB só é gravada em config.properties. Nunca é impressa nem enviada para outro lugar.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

msg() { printf '%s\n' "$*"; }
die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }

# 1. IP da TV
IP="${1:-}"
[ -n "$IP" ] || die "informe o IP da TV. Uso: bash webos/termux-install.sh <IP_DA_TV>"
printf '%s' "$IP" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || die "IP inválido: $IP"

# 2. Dependências (Python 3 e OpenSSH)
need_pkgs() {
    [ -n "$(command -v python3 || command -v python)" ] || return 0
    [ -n "$(command -v ssh)" ] || return 0
    [ -n "$(command -v ssh-keygen)" ] || return 0
    return 1
}
if need_pkgs && command -v pkg >/dev/null 2>&1; then
    msg "Instalando Python e OpenSSH (pkg) ..."
    pkg install -y python openssh
fi
PY="$(command -v python3 || command -v python || true)"
[ -n "$PY" ] || die "Python não encontrado. Rode: pkg install python"
for cmd in ssh ssh-keygen; do
    command -v "$cmd" >/dev/null 2>&1 || die "$cmd não encontrado. Rode: pkg install openssh"
done

# 3. config.properties (a partir do exemplo, se ainda não existir)
CONF="$ROOT/config.properties"
if [ ! -f "$CONF" ]; then
    cp "$ROOT/config.example.properties" "$CONF"
    msg "config.properties criado a partir do exemplo."
fi

# 4. Chave TMDB (só se estiver vazia). Lida sem eco e gravada escapando \ / & para o sed.
if grep -Eq '^tmdb_key=[[:space:]]*$' "$CONF"; then
    printf 'Chave TMDB (enter para pular): '
    TMDB_KEY=""
    read -rs TMDB_KEY || true
    echo
    if [ -n "$TMDB_KEY" ]; then
        ESC="$(printf '%s' "$TMDB_KEY" | sed -e 's/[\\/&]/\\&/g')"
        sed -i "s/^tmdb_key=.*/tmdb_key=${ESC}/" "$CONF"
        unset ESC
        msg "Chave TMDB gravada em config.properties."
    else
        msg "Sem chave TMDB: as escolhas de filmes e séries ficam desligadas."
    fi
    unset TMDB_KEY
fi

# 5. Compilar o .ipk (apaga o antigo para não confundir com um build que falhou)
rm -f "$ROOT/FreeMyTV-webos.ipk"
msg "Compilando FreeMyTV-webos.ipk ..."
"$PY" "$ROOT/webos/build.py" || die "a compilação falhou (veja a mensagem acima)."
[ -s "$ROOT/FreeMyTV-webos.ipk" ] || die "FreeMyTV-webos.ipk não foi gerado."

# 6. Instalar na TV
msg "Instalando na TV $IP ..."
"$PY" "$ROOT/webos/install.py" "$IP" || die "a instalação na TV falhou (veja a mensagem acima)."
msg "Pronto."
