# Security Policy

## Reporting a Vulnerability

Do NOT open a public GitHub issue for security vulnerabilities.

Report privately with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We respond within 48 hours.

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ Yes |

## Scope

- Stellar signature verification logic (`src/auth/auth.service.ts`)
- JWT token handling
- API authentication guards
- Prisma database queries (SQL injection prevention)
- Soroban RPC interaction (`src/stellar/stellar.service.ts`)

## Out of Scope

- Third-party dependency vulnerabilities
- Issues requiring physical access
