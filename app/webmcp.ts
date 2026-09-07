type Context = {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute(input: unknown): unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
};
export function registerNavigation(
  navigate: (
    view: 'Home' | 'Matches' | 'Squad' | 'Updates' | 'Reminders',
  ) => void,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      context.registerTool(
        {
          name: 'navigate_barca',
          title: 'Open a Barça screen',
          description:
            'Open Home, Matches, Squad, Updates or Reminders. Only navigates; does not enable notifications or change preferences.',
          inputSchema: {
            type: 'object',
            properties: {
              view: {
                type: 'string',
                enum: ['Home', 'Matches', 'Squad', 'Updates', 'Reminders'],
              },
            },
            required: ['view'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              !('view' in input) ||
              typeof input.view !== 'string' ||
              !['Home', 'Matches', 'Squad', 'Updates', 'Reminders'].includes(
                input.view,
              ) ||
              Object.keys(input).length !== 1
            )
              throw new Error('Choose a valid Barça screen.');
            const view = input.view as Parameters<typeof navigate>[0];
            navigate(view);
            return { view, dataMode: 'demo' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional browser capability. */
  }
  return () => lifecycle.abort();
}
