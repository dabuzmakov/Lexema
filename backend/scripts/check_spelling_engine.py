import argparse
from importlib.metadata import version
import re
import shutil
import subprocess
import sys


def parse_java_major(version_output: str) -> int:
    match = re.search(r'version "([^"]+)"', version_output)
    if not match:
        match = re.search(r"\b(?:openjdk|java)\s+([0-9][^\s]*)", version_output, re.IGNORECASE)
    if not match:
        raise RuntimeError(f"Cannot parse Java version from: {version_output}")

    raw_version = match.group(1)
    parts = raw_version.split(".")
    if parts[0] == "1" and len(parts) > 1:
        return int(parts[1])
    return int(parts[0])


def check_java() -> None:
    java_path = shutil.which("java")
    if not java_path:
        raise RuntimeError("Java Runtime is not available in PATH")

    result = subprocess.run(
        [java_path, "-version"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "java -version failed")

    version_output = result.stderr.strip() or result.stdout.strip()
    major = parse_java_major(version_output)
    if major < 17:
        raise RuntimeError(f"Java 17 or newer is required, found Java {major}")

    print(version_output.splitlines()[0])


def check_import() -> None:
    import language_tool_python

    print(f"language-tool-python {version('language-tool-python')}")


def check_engine(language: str) -> None:
    import language_tool_python

    tool = language_tool_python.LanguageTool(language)
    try:
        matches = tool.check("This are a spelling errror.")
        print(f"LanguageTool {language}: {len(matches)} matches")
    finally:
        tool.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Check LanguageTool runtime prerequisites.")
    parser.add_argument(
        "--runtime-only",
        action="store_true",
        help="Check Java and Python package only, without starting/downloading LanguageTool.",
    )
    parser.add_argument("--language", default="en-US", help="LanguageTool language for full engine check.")
    args = parser.parse_args()

    try:
        check_java()
        check_import()
        if not args.runtime_only:
            check_engine(args.language)
    except Exception as exc:
        print(f"SPELLING_ENGINE_CHECK_FAILED: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
