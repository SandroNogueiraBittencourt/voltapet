# VoltaPet — Frontend integrado ao backend

Este pacote substitui a tela de apresentação estática por uma interface React com listagem e filtros de pets, tela de detalhes, cadastro/login e publicação de ocorrência.

## Instalação no projeto existente

No diretório `/home/sandro/Documentos/ADS/Projeto`:

```bash
cp -a VoltaPet-FrontEnd VoltaPet-FrontEnd.backup
unzip -o ~/Downloads/VoltaPet-FrontEnd-Integrado.zip -d .
docker compose build --no-cache frontend
docker compose up -d --no-deps --force-recreate frontend
```

**Não** remova o diretório `.git` existente. O ZIP não traz `.git`, `.env` nem `node_modules`.

## Validação

```bash
docker compose ps -a
curl -i 'http://localhost:3000/api/v1/pets?status=LOST'
curl -i http://localhost:3000/health
```

O endpoint `/api/v1/pets` deve retornar JSON com `content`, não o documento `index.html`. Acesse `http://localhost:3000/` e teste a listagem com uma ocorrência previamente cadastrada.

A compilação Docker exige acesso ao registro NPM para baixar dependências. Os testes automatizados podem ser executados a partir do diretório frontend com `npm install && npm test`.

## Considerações

- A URL do frontend é relativa (`/api/v1`) para evitar conflitos de CORS. O nginx encaminha as requisições ao serviço `backend:8080` na rede Compose.
- O JWT fica apenas em memória, portanto o usuário faz login novamente ao atualizar a página.
- Esta entrega não implementa upload de imagens no MinIO; usa ilustrações de animais.
- Este ZIP não substitui o `docker-compose.yml` da raiz nem altera o backend ou seus volumes.
