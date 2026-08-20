# 📱 Guia Oficial: Publicação do Aplicativo Clube Fitness nas Lojas

Este documento contém todas as informações e instruções para gerar e publicar o aplicativo **Clube Fitness** na **Google Play Store (Android)** e na **Apple App Store (iOS)**.

---

## 🏗️ 1. Estrutura do Projeto Mobile

- **ID do Aplicativo**: `com.clubefitness.app`
- **Nome Oficial**: `Clube Fitness`
- **Tecnologia**: Capacitor 6 (Next.js 16 + React 19)
- **Live Sync**: Configurado diretamente com o servidor de produção (`https://clubefitness.vercel.app`), garantindo que qualquer alteração de treino, avaliação ou layout se atualize automaticamente no celular dos alunos sem precisar de nova aprovação nas lojas a cada ajuste!

---

## 🤖 2. Publicação na Google Play Store (Android)

### Passo 1: Criar a Conta de Desenvolvedor
1. Acesse: **[Google Play Console](https://play.google.com/console/signup)**.
2. Faça login com a conta Google da academia.
3. Pague a taxa única de **US$ 25** (vitalícia).
4. Complete a verificação de identidade (documento pessoal ou dados do CNPJ).

### Passo 2: Gerar o Pacote `.aab` (Android App Bundle)
O projeto Android nativo já está criado na pasta `android/`.
Para abrir e compilar:
1. Abra o **Android Studio**.
2. Abra a pasta: `C:\Users\user\.gemini\antigravity-ide\scratch\clubefitness\android`.
3. No menu superior: clique em **Build** $\rightarrow$ **Generate Signed Bundle / APK**.
4. Selecione **Android App Bundle (`.aab`)**.
5. Crie a chave de assinatura (`keystore`) e clique em **Release**.
6. O arquivo `app-release.aab` será gerado na pasta `android/app/release/`.

### Passo 3: Submeter na Google Play
1. No painel do Google Play Console, clique em **Criar App**.
2. Nome: **Clube Fitness**.
3. Categoria: **Saúde e Fitness**.
4. Faça o upload do arquivo `app-release.aab`.
5. Preencha a descrição, envie as capturas de tela e clique em **Enviar para Revisão**.

---

## 🍏 3. Publicação na Apple App Store (iOS / iPhone)

### Passo 1: Criar a Conta de Desenvolvedor
1. Acesse: **[Apple Developer Program](https://developer.apple.com/programs)**.
2. Faça login com seu Apple ID.
3. Assine o programa anual por **US$ 99/ano**.
4. Escolha **Pessoa Física** (ativação rápida com CPF) ou **Pessoa Jurídica** (com número D-U-N-S da empresa).

### Passo 2: Gerar o Pacote `.ipa`
1. Em um computador Mac, abra a pasta `ios/` no **Xcode**.
2. Selecione seu time de desenvolvedor em **Signing & Capabilities**.
3. No menu superior: clique em **Product** $\rightarrow$ **Archive**.
4. Clique em **Distribute App** $\rightarrow$ **App Store Connect**.

---

## 📝 4. Textos Promocionais & Metadados para as Lojas

- **Título**: Clube Fitness | Treinos, Avaliações e Frequência
- **Descrição Curta**: Acompanhe seus treinos, agendamentos e evolução física na Clube Fitness.
- **Descrição Completa**:
  > O aplicativo oficial do Clube Fitness oferece a você uma experiência completa e personalizada para cuidar da sua saúde, performance e qualidade de vida.
  > 
  > Principais Recursos:
  > • Acesso à sua Ficha de Treino completa e personalizada com vídeos e orientações.
  > • Agendamento de aulas, treinos monitorados e fisioterapia.
  > • Histórico de avaliações físicas, composição corporal e testes de força.
  > • Acompanhamento da sua frequência e ranking de constância.
  > • Gestão do seu plano, histórico de pagamentos e muito mais!

---

## 🛡️ 5. Comandos Úteis do Capacitor

- Sincronizar alterações da web com o Android:
  ```bash
  npx cap sync android
  ```
- Abrir o projeto no Android Studio:
  ```bash
  npx cap open android
  ```
