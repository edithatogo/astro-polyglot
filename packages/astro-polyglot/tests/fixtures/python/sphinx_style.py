def process_request(url: str, timeout: int = 30) -> dict:
    """
    Send an HTTP request and process the response.

    :param url: The target URL for the request.
    :type url: str
    :param timeout: Request timeout in seconds. Defaults to 30.
    :type timeout: int
    :returns: Parsed response data.
    :rtype: dict
    :raises ConnectionError: If the server cannot be reached.
    :raises TimeoutError: If the request exceeds the timeout.
    """
    pass
