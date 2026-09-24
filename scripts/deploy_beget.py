#!/usr/bin/env python3
"""Выкатка сайта на Beget.

Файлы через API Beget не заливаются — там нет такого метода. Поэтому скрипт
делает то же, что раньше делалось руками, но сам:

  1. собирает сайт (npm run build) и проверяет сборку: страницы и ссылки на файлы;
  2. через API Beget заводит временный FTP-аккаунт со случайным паролем,
     у которого доступ только к папке сайта;
  3. заливает dist/ по FTPS: сначала ассеты, HTML последним — чтобы страницы
     не ссылались на файлы, которых на сервере ещё нет;
  4. удаляет временный аккаунт, даже если заливка упала;
  5. проверяет, что живой сайт отдаёт свежие хеши.

Старые файлы на сервере не удаляются — удаление живого сайта не автоматизируем.

Доступ берётся из переменных окружения, в коде и в репозитории его нет:

  BEGET_LOGIN         логин панели Beget
  BEGET_API_PASSWORD  пароль для API: панель Beget → раздел «API»
                      (там же лучше ограничить доступ по IP)

Необязательные:

  BEGET_FTP_HOST      FTP-хост, по умолчанию <login>.beget.tech
  BEGET_SITE_DIR      папка сайта, по умолчанию /<login>.beget.tech/public_html
  SITE_URL            адрес для проверки, по умолчанию https://danyatroyanov.com/

Запуск:

  python3 scripts/deploy_beget.py             # собрать и выкатить
  python3 scripts/deploy_beget.py --no-build  # выкатить уже собранный dist/
  python3 scripts/deploy_beget.py --dry-run   # показать, что уедет, без сети
  python3 scripts/deploy_beget.py --with-tests  # ещё и npm test перед сборкой
"""

from __future__ import annotations

import argparse
import ftplib
import json
import os
import re
import secrets
import signal
import ssl
import string
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
API = "https://api.beget.com/api"


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if not value:
        sys.exit(f"Не задана переменная окружения {name}")
    return value


def beget(method: str, login: str, password: str, data: dict) -> object:
    """Вызов API Beget. Возвращает result или завершает скрипт с ошибкой."""
    query = urllib.parse.urlencode({
        "login": login,
        "passwd": password,
        "input_format": "json",
        "output_format": "json",
        "input_data": json.dumps(data),
    })
    # POST, чтобы пароль не оседал в логах запросов как часть URL.
    request = urllib.request.Request(f"{API}/{method}", data=query.encode(), method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    answer = payload.get("answer", {}) if payload.get("status") == "success" else payload
    if payload.get("status") != "success" or answer.get("status") != "success":
        errors = answer.get("errors") or payload.get("errors") or payload
        raise RuntimeError(f"Beget API {method}: {errors}")
    return answer.get("result")


def run_step(command: list[str], timeout: int = 300) -> None:
    """Запускает шаг сборки с таймаутом; если завис — убивает всё дерево и пробует ещё раз.

    Проект лежит в iCloud Documents: пока iCloud выгружает свежие видео, чтение
    файлов иногда подвисает. Второй заход обычно проходит за секунды.
    """
    for attempt in (1, 2):
        print("→", " ".join(command), "" if attempt == 1 else "(повтор)", flush=True)
        process = subprocess.Popen(command, cwd=ROOT, start_new_session=True)
        try:
            code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            if attempt == 1:
                print(f"  шаг висит дольше {timeout // 60} мин — перезапускаю", flush=True)
                continue
            sys.exit(
                "✗ Сборка зависла дважды. Подожди, пока iCloud догрузит файлы\n"
                "  (значок облака в Finder), и запусти снова."
            )
        if code != 0:
            sys.exit(f"✗ «{' '.join(command)}» упал с кодом {code}")
        return


def verify_dist() -> None:
    """Быстрая проверка сборки вместо полного npm test.

    npm test собирает сайт ещё раз в памяти и на iCloud иногда виснет. Здесь
    проверяем то, что реально ломало прод: все четыре страницы собраны, а каждый
    файл, на который ссылаются HTML и CSS, лежит в dist/.
    """
    for page in ("index.html", "artifact.html", "ai-producer.html", "taya.html"):
        if not (DIST / page).is_file():
            sys.exit(f"✗ В сборке нет страницы {page}")
    pattern = re.compile(
        r"(?<![\w./])/?assets/[\w@.\-/]+\.(?:js|css|mp4|webm|jpe?g|png|webp|svg|pdf|woff2?|ttf|gif)"
    )
    missing = set()
    for path in DIST.rglob("*"):
        if path.suffix not in (".html", ".css"):
            continue
        for ref in pattern.findall(path.read_text("utf-8", errors="ignore")):
            if not (DIST / ref.lstrip("/")).is_file():
                missing.add(f"{ref} (в {path.name})")
    if missing:
        sys.exit("✗ В сборке не хватает файлов:\n  " + "\n  ".join(sorted(missing)))
    print("✓ сборка проверена: страницы на месте, битых ссылок нет", flush=True)


def ensure_deps() -> None:
    """Ставит зависимости, если их нет: node_modules не лежит в гите, и на
    чистой машине (или после чистки кеша) npm run build падает с «vite: command
    not found»."""
    if (ROOT / "node_modules" / ".bin" / "vite").exists():
        return
    print("node_modules пустая — ставлю зависимости", flush=True)
    lock = "package-lock.json" if (ROOT / "package-lock.json").is_file() else None
    run_step(["npm", "ci" if lock else "install"], timeout=600)


def build(with_tests: bool) -> None:
    ensure_deps()
    if with_tests:
        run_step(["npm", "test"])
    run_step(["npm", "run", "build"])
    verify_dist()


def files_in_upload_order() -> list[Path]:
    files = sorted(p for p in DIST.rglob("*") if p.is_file())
    if not files:
        sys.exit("dist/ пустая — сначала собери сайт")
    # HTML последним: пока он старый, он ссылается на старые ассеты, которые
    # никуда не делись; новый HTML появляется, когда его ассеты уже на месте.
    return sorted(files, key=lambda p: (p.suffix == ".html", str(p)))


class SessionReuseFTP_TLS(ftplib.FTP_TLS):
    """FTPS, который переиспользует TLS-сессию на канале данных.

    FTP-сервер Beget требует, чтобы канал передачи файлов продолжал TLS-сессию
    управляющего соединения, иначе отвечает «522 session reuse required».
    Стандартный ftplib открывает для данных новую сессию — здесь подставляем
    сессию управляющего сокета.
    """

    def ntransfercmd(self, cmd, rest=None):
        conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            conn = self.context.wrap_socket(conn, server_hostname=self.host, session=self.sock.session)
        return conn, size


def ensure_dir(ftp: ftplib.FTP_TLS, remote_dir: str, known: set[str]) -> None:
    parts = [part for part in remote_dir.split("/") if part]
    path = ""
    for part in parts:
        path = f"{path}/{part}" if path else part
        if path in known:
            continue
        try:
            ftp.mkd(path)
        except ftplib.error_perm:
            pass  # папка уже есть
        known.add(path)


def upload(host: str, user: str, password: str, files: list[Path]) -> None:
    context = ssl.create_default_context()
    # В TLS 1.3 сессия появляется у сокета не сразу после рукопожатия, и её
    # нечем переиспользовать на канале данных. TLS 1.2 отдаёт её сразу.
    context.maximum_version = ssl.TLSVersion.TLSv1_2
    ftp = SessionReuseFTP_TLS(host, timeout=60, context=context)
    try:
        ftp.login(user, password)
        ftp.prot_p()  # шифруем и данные, а не только логин
        known: set[str] = set()
        total = len(files)
        for index, path in enumerate(files, 1):
            remote = path.relative_to(DIST).as_posix()
            ensure_dir(ftp, str(Path(remote).parent.as_posix()) if "/" in remote else "", known)
            with path.open("rb") as handle:
                ftp.storbinary(f"STOR {remote}", handle)
            print(f"  [{index}/{total}] {remote}", flush=True)
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


def verify(site_url: str) -> None:
    expected = set(re.findall(r"assets/[\w.-]+\.(?:js|css)", (DIST / "index.html").read_text("utf-8")))
    url = f"{site_url}?deploy={int(time.time())}"  # мимо кеша
    with urllib.request.urlopen(url, timeout=30) as response:
        live = set(re.findall(r"assets/[\w.-]+\.(?:js|css)", response.read().decode("utf-8", "ignore")))
    missing = expected - live
    if missing:
        raise RuntimeError(f"Сайт отдаёт старую сборку, не хватает: {sorted(missing)}")
    print(f"✓ {site_url} отдаёт свежую сборку ({len(expected)} файлов совпали)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--no-build", action="store_true", help="не собирать, взять готовый dist/")
    parser.add_argument("--dry-run", action="store_true", help="только показать список файлов")
    parser.add_argument("--with-tests", action="store_true", help="перед сборкой прогнать npm test")
    args = parser.parse_args()

    # Доступ проверяем до сборки: иначе ошибка про пароль всплывёт через минуту.
    if not args.dry_run:
        env("BEGET_LOGIN")
        env("BEGET_API_PASSWORD")

    if not args.no_build and not args.dry_run:
        build(args.with_tests)

    files = files_in_upload_order()
    size = sum(p.stat().st_size for p in files) / 1024 / 1024
    print(f"К заливке: {len(files)} файлов, {size:.1f} МБ")

    if args.dry_run:
        for path in files:
            print("  ", path.relative_to(DIST).as_posix())
        return

    login = env("BEGET_LOGIN")
    api_password = env("BEGET_API_PASSWORD")
    host = env("BEGET_FTP_HOST", f"{login}.beget.tech")
    site_dir = env("BEGET_SITE_DIR", f"/{login}.beget.tech/public_html")
    site_url = env("SITE_URL", "https://danyatroyanov.com/")

    # Beget ограничивает полный логин «login_suffix» 17 символами.
    room = 17 - len(login) - 1
    if room < 2:
        sys.exit(f"Логин {login} слишком длинный для временного FTP-аккаунта")
    suffix = "d" + secrets.token_hex(4)[: room - 1]
    alphabet = string.ascii_letters + string.digits
    ftp_password = "".join(secrets.choice(alphabet) for _ in range(24))
    ftp_user = f"{login}_{suffix}"

    print(f"→ временный FTP-аккаунт {ftp_user} → {site_dir}")
    beget("ftp/add", login, api_password, {"suffix": suffix, "homedir": site_dir, "password": ftp_password})
    try:
        upload(host, ftp_user, ftp_password, files)
    finally:
        beget("ftp/delete", login, api_password, {"suffix": suffix})
        print(f"→ временный аккаунт {ftp_user} удалён")

    verify(site_url)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError, OSError, ftplib.Error) as error:
        sys.exit(f"✗ {error}")
