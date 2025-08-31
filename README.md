# ... previous content ...
# Setup do banco de testes (necessário para rodar testes)
DATABASE_URL="file:./prisma/test.db" npm run db:push
# ... previous content ...
npm run db:generate    # Regenera cliente Prisma
npm run db:push        # Atualiza schema no banco

# Testes
npm test              # Roda todos os testes (backend + frontend)
npm run test:backend  # Apenas testes do backend
npm run test:frontend # Apenas testes do frontend
# ... previous content ...
## Executando Testes

Para rodar os testes, primeiro certifique-se de que o banco de testes está configurado:

```bash
# Se ainda não configurou o banco de testes
DATABASE_URL="file:./prisma/test.db" npm run db:push

# Roda todos os testes
npm test

# Ou separadamente
npm run test:backend   # 78 testes da API REST
npm run test:frontend  # 44 testes dos componentes React
```

**Nota:** Os testes usam um banco SQLite separado (`prisma/test.db`) que é limpo antes de cada teste.
