/**
 * Sessão do app (token da API): cache em memória, lido pelo interceptor do
 * cliente a cada requisição, e persistido no armazenamento do aparelho.
 */

/** Subconjunto do AsyncStorage usado aqui (injetado: o pacote não depende do módulo nativo). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

export interface SessionOptions {
  storage: KeyValueStorage;
  /** Chave do token (ex.: "voztri.driver.token"). */
  tokenKey: string;
  /** Outras chaves apagadas junto com o token no logout (ex.: a corrida em andamento). */
  clearKeys?: readonly string[];
}

export interface Session {
  /** Lê o token salvo (abertura do app) e o coloca no cache. */
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
  /** Logout ou sessão expirada: apaga o token e as clearKeys. */
  clear(): Promise<void>;
  /** Token em memória, sem ler o armazenamento (ex.: para o serviço nativo de rastreamento). */
  current(): string | null;
}

export function createSession({ storage, tokenKey, clearKeys = [] }: SessionOptions): Session {
  let token: string | null = null;

  return {
    async load() {
      token = await storage.getItem(tokenKey);
      return token;
    },
    async save(value) {
      token = value;
      await storage.setItem(tokenKey, value);
    },
    async clear() {
      token = null;
      await storage.multiRemove([tokenKey, ...clearKeys]);
    },
    current: () => token,
  };
}
