# QADAM web

Next.js-интерфейс пользовательского пути: upload → polling → grounded report → question →
landlord message.

Из корня репозитория:

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

Browser E2E запускается командой `make e2e`; для воспроизводимого screenshot pack —
`make screenshots`.
