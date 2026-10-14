export function createTestRequest(path: string, init: RequestInit = {}): Request {
  const url = path.startsWith('/') ? `http://api.local${path}` : path;
  return new Request(url, init);
}
