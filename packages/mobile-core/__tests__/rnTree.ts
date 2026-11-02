import { act, ReactTestInstance, ReactTestRenderer, ReactTestRendererJSON } from 'react-test-renderer';

type Node = ReactTestRendererJSON | string;

/**
 * Procura textos fora de <Text> na árvore nativa renderizada. No dispositivo,
 * isso derruba o app ("Text strings must be rendered within a <Text>").
 */
export function findStrayText(tree: ReactTestRendererJSON | ReactTestRendererJSON[] | null): string[] {
  const stray: string[] = [];
  const visit = (node: Node, insideText: boolean) => {
    if (typeof node === 'string') {
      if (!insideText && node.trim() !== '') stray.push(node);
      return;
    }
    const isText = node.type === 'Text';
    (node.children ?? []).forEach((child) => visit(child, insideText || isText));
  };
  const roots = tree == null ? [] : Array.isArray(tree) ? tree : [tree];
  roots.forEach((root) => visit(root, false));
  return stray;
}

export function expectNoStrayText(renderer: ReactTestRenderer): void {
  expect(findStrayText(renderer.toJSON())).toEqual([]);
}

/** Todos os textos visíveis, para checar o que está na tela. */
export function visibleText(renderer: ReactTestRenderer): string {
  const out: string[] = [];
  // Pedaços dentro do mesmo <Text> (ex.: 'Expira em {n}s') formam um único texto na tela
  const textOf = (node: Node): string =>
    typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('');
  const visit = (node: Node) => {
    if (typeof node === 'string') out.push(node);
    else if (node.type === 'Text') out.push(textOf(node));
    else (node.children ?? []).forEach(visit);
  };
  const tree = renderer.toJSON();
  (tree == null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(visit);
  return out.join(' ');
}

/** Toca no elemento interativo cujo accessibilityLabel bate com o texto ou regex. */
export function press(renderer: ReactTestRenderer, label: string | RegExp): void {
  const matches = (value: unknown) =>
    typeof value === 'string' && (typeof label === 'string' ? value === label : label.test(value));
  const target = renderer.root.findAll(
    (node: ReactTestInstance) => typeof node.props.onPress === 'function' && matches(node.props.accessibilityLabel),
  )[0];
  if (!target) throw new Error(`Nenhum elemento tocável com accessibilityLabel ${String(label)}`);
  act(() => {
    target.props.onPress();
  });
}

/** Digita num TextInput identificado pelo accessibilityLabel. */
export function typeInto(renderer: ReactTestRenderer, label: string, text: string): void {
  const input = renderer.root.findAll(
    (node: ReactTestInstance) => typeof node.props.onChangeText === 'function' && node.props.accessibilityLabel === label,
  )[0];
  if (!input) throw new Error(`Nenhum TextInput com accessibilityLabel ${label}`);
  act(() => {
    input.props.onChangeText(text);
  });
}

export function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

// ---- Versões assíncronas: esperam as promessas disparadas pelos toques ----

/** Resolve a fila de promessas (requer setImmediate real nos timers falsos). */
export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

export async function settle(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await flush();
    });
  }
}

export async function pressAsync(renderer: ReactTestRenderer, label: string | RegExp): Promise<void> {
  press(renderer, label);
  await settle();
}

export async function typeAsync(renderer: ReactTestRenderer, label: string, text: string): Promise<void> {
  typeInto(renderer, label, text);
  await settle();
}

export async function advanceAsync(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await flush();
  });
  await settle();
}

/** Timers falsos que mantêm setImmediate real, usado por flush(). */
export function useTestTimers(): void {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
}

export function isDisabled(renderer: ReactTestRenderer, label: string): boolean {
  const target = renderer.root.findAll(
    (node: ReactTestInstance) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label,
  )[0];
  if (!target) throw new Error(`Nenhum elemento tocável com accessibilityLabel ${label}`);
  return !!target.props.disabled;
}
