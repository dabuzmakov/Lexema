from main import app


def test_frontend_expected_routes_are_registered():
    route_methods = {}
    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        route_methods.setdefault(route.path, set()).update(methods)

    expected_routes = {
        "/health": {"GET"},
        "/app/state": {"GET"},
        "/documents": {"GET", "POST"},
        "/documents/{document_id}": {"PATCH", "DELETE"},
        "/settings": {"GET", "PUT"},
        "/analysis/seo": {"POST"},
        "/analysis/spelling": {"POST"},
        "/analysis/compare": {"POST"},
        "/export/csv/seo/{table_type}": {"GET"},
        "/export/csv/compare/{table_type}": {"GET"},
        "/export/zip/seo": {"GET"},
    }

    for path, methods in expected_routes.items():
        assert path in route_methods
        assert methods <= route_methods[path]

    forbidden_routes = {
        "/corpus": {"PUT"},
        "/analysis/run": {"POST"},
        "/export/csv/{identifier}": {"GET"},
        "/documents": {"PUT"},
    }
    for path, methods in forbidden_routes.items():
        registered_methods = route_methods.get(path, set())
        assert registered_methods.isdisjoint(methods)


def test_application_metadata_is_stable():
    assert app.title == "Лексема API"
