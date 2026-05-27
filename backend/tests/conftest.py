import sys
import types
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if "asyncpg" not in sys.modules:
    sys.modules["asyncpg"] = types.SimpleNamespace(
        Connection=object,
        Pool=object,
        Record=object,
    )
