# Meta Repo Study

Projeto criado para estudar e aplicar o conceito de meta-repositório.

## Objetivo

Organizar múltiplos repositórios independentes dentro de um único workspace,
mantendo documentação, contexto e instruções compartilhadas.

## Projetos

- Backend
- Frontend

## Comandos do workspace

```powershell
npm.cmd install
npm.cmd run workspace:bootstrap
npm.cmd run workspace:validate
npm.cmd run workspace:health
```

Use `npm.cmd run workspace:bootstrap -- --dry-run` para visualizar quais
repositórios seriam clonados antes de alterar o disco.
