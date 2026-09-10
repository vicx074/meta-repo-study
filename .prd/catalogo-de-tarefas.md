# PRD — Catálogo de tarefas

## Objetivo

Permitir que uma pessoa visualize, crie e conclua tarefas em uma única lista.
O exercício mostra como frontend e backend evoluem em repositórios independentes
usando um contrato documentado no meta-repo.

## Responsabilidades

| Projeto | Responsabilidade |
| --- | --- |
| `vicx-backend` | Expor e validar a API de tarefas. |
| `vicx-frontend` | Exibir a lista e enviar ações da pessoa usuária para a API. |
| `meta-repo-study` | Manter este PRD e o contrato compartilhado. |

## Modelo de tarefa

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | string | Identificador gerado pelo backend. |
| `title` | string | Obrigatório, entre 3 e 120 caracteres após remover espaços das extremidades. |
| `completed` | boolean | Começa como `false`. |
| `createdAt` | string | Data e hora ISO 8601 gerada pelo backend. |

## Contrato da API

### Listar tarefas

`GET /api/tasks`

Resposta de sucesso: `200 OK` com uma lista de tarefas.

### Criar tarefa

`POST /api/tasks`

Corpo:

```json
{ "title": "Revisar o workspace" }
```

Resposta de sucesso: `201 Created` com a tarefa criada.

Se o título for inválido, a resposta é `400 Bad Request`.

### Concluir ou reabrir tarefa

`PATCH /api/tasks/:id`

Corpo:

```json
{ "completed": true }
```

Resposta de sucesso: `200 OK` com a tarefa atualizada. Uma tarefa inexistente
retorna `404 Not Found`.

## Critérios de aceite

1. A interface carrega as tarefas fornecidas pela API.
2. Uma tarefa válida criada na interface aparece na lista.
3. A pessoa usuária pode marcar uma tarefa como concluída e reabri-la.
4. Um título inválido recebe uma mensagem compreensível.

## Fora do escopo deste exercício

- Autenticação e contas de usuário.
- Banco de dados persistente; os dados podem viver em memória enquanto o servidor estiver ligado.
- Exclusão, filtros e ordenação de tarefas.
