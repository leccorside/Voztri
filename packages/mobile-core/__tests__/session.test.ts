/**
 * createSession: token em memória e no armazenamento injetado (o AsyncStorage dos
 * apps), com chaves extras apagadas no logout.
 */
import { createSession, KeyValueStorage } from '../src/session';

/** Armazenamento em memória com a mesma interface usada do AsyncStorage. */
function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    multiRemove: async (keys) => keys.forEach((k) => data.delete(k)),
  };
}

it('guarda o token no armazenamento e na memória', async () => {
  const storage = memoryStorage();
  const session = createSession({ storage, tokenKey: 'app.token' });

  expect(session.current()).toBeNull();
  await session.save('tok-1');
  expect(storage.data.get('app.token')).toBe('tok-1');
  expect(session.current()).toBe('tok-1');
});

it('retoma o token salvo ao abrir o app', async () => {
  const session = createSession({ storage: memoryStorage({ 'app.token': 'tok-salvo' }), tokenKey: 'app.token' });

  expect(session.current()).toBeNull(); // só depois do load
  expect(await session.load()).toBe('tok-salvo');
  expect(session.current()).toBe('tok-salvo');
});

it('sem token salvo, load devolve null', async () => {
  const session = createSession({ storage: memoryStorage(), tokenKey: 'app.token' });
  expect(await session.load()).toBeNull();
});

it('logout apaga o token e as chaves extras, mantendo o resto', async () => {
  const storage = memoryStorage({ 'app.ride': 'ride-1', 'outra.chave': 'fica' });
  const session = createSession({ storage, tokenKey: 'app.token', clearKeys: ['app.ride'] });
  await session.save('tok-1');

  await session.clear();

  expect(session.current()).toBeNull();
  expect([...storage.data.keys()]).toEqual(['outra.chave']);
});

it('cada sessão tem o próprio token (estado por instância)', async () => {
  const a = createSession({ storage: memoryStorage(), tokenKey: 'a.token' });
  const b = createSession({ storage: memoryStorage(), tokenKey: 'b.token' });
  await a.save('tok-a');
  expect(b.current()).toBeNull();
});
