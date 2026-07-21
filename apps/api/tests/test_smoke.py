def test_qadam_api_package_is_importable() -> None:
    import qadam_api

    assert qadam_api.__version__ == "0.1.0"
