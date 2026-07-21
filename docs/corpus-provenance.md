# QADAM AI Legal Corpus Provenance

## Snapshot

- Corpus version: `2026.07.17`
- Verification date: 17 July 2026
- Primary authority: Kazakhstan legal information system `Әділет`
- Supported language in the initial snapshot: Russian

The housing-law snapshot was checked after amendments effective from 1 July 2026. Each loaded
chunk receives a SHA-256 checksum of the exact stored text; the manifest loader also pins every
corpus file by SHA-256.

## Canonical sources

- Law “On Housing Relations”: <https://adilet.zan.kz/rus/docs/Z970000094_>
- Civil Code, Special Part: <https://adilet.zan.kz/rus/docs/K990000409_>
- Law “On Personal Data and Their Protection”: <https://adilet.zan.kz/rus/docs/Z1300000094>

## Retrieval limitation

The official site intermittently returned HTTP 502 and local certificate-chain errors during
direct retrieval. Only passages visible through the official Adilet search index and already
confirmed in the project research were included. The corpus is deliberately narrow: it supports
retrieval and educational explanations for the MVP and must not be treated as a complete legal
database.

Before a public release beyond the hackathon, a qualified Kazakhstan lawyer should verify every
stored passage against the official publication and add Kazakh-language equivalents.
