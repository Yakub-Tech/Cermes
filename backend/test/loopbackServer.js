import http from 'node:http';

export async function starteLoopbackServer(anfrageBearbeiter) {
  const server = http.createServer(anfrageBearbeiter);
  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
  server.unref();
  return server;
}
