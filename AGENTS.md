<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Regras do Projeto

1. **Obrigatoriedade de Plano para Todo Comando**:
   - Qualquer comando, pedido ou solicitação enviada no chat deve obrigatoriamente entrar em Modo de Planejamento e ser documentada em `implementation_plan.md`.
   - **Nenhuma modificação de código, criação de arquivos de projeto ou comando modificador no repositório pode ser executada antes de obter a aprovação explícita do usuário no plano**.

2. **Investigação Estrita no Código Real (Sem Suposições)**:
   - O agente **nunca deve supor ou deduzir comportamentos** apenas por lógica abstrata ou desenho teórico.
   - É mandatório inspecionar diretamente os arquivos de código-fonte, banco de dados e rotas relevantes, rastreando o fluxo real para entender exatamente o que ocorreu, onde está o problema e onde deve melhorar antes de propor a solução.
