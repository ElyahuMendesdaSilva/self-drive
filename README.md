# Self Drive

Aplicativo móvel para acessar e gerenciar arquivos em um servidor próprio compatível com a API do **File Browser Quantum**. O Self Drive oferece navegação de arquivos em uma interface feita com React Native e Expo.

> **Dependência essencial:** o Self Drive precisa de um servidor de API compatível para funcionar. Use a [API do Self Drive, baseada no File Browser Quantum](https://github.com/ElyahuMendesdaSilva/filebrowser-quantum-self-drive/tree/self-drive-api).

## Funcionalidades

- Navegar por pastas e visualizar arquivos recentes.
- Pesquisar arquivos e pastas.
- Enviar arquivos e pastas ao servidor, criar pastas e baixar ou compartilhar arquivos.
- Copiar, mover, renomear, favoritar e excluir itens.
- Gerenciar itens excluídos na lixeira.
- Criar e administrar links de compartilhamento, quando permitido pelo servidor.
- Consultar estatísticas de armazenamento e atividade.
- Acessar opções administrativas do servidor, de acordo com a conta e as permissões disponíveis.
- Escolher tema claro, escuro ou seguir a aparência do dispositivo.
- Receber arquivos compartilhados de outros aplicativos.

Algumas opções dependem dos recursos e das permissões habilitados no servidor conectado.

## Requisitos

- Node.js compatível com Expo SDK 57.
- npm.
- Um servidor File Browser Quantum compatível com as rotas de API utilizadas pelo app.
- Um dispositivo ou emulador com acesso de rede ao servidor.

### Servidor de API

O app depende do servidor de API para autenticação, listagem e gerenciamento dos arquivos. O código da versão modificada está em um repositório separado:

- **Código-fonte:** [filebrowser-quantum-self-drive — branch `self-drive-api`](https://github.com/ElyahuMendesdaSilva/filebrowser-quantum-self-drive/tree/self-drive-api)
- **Instalação e configuração:** consulte o README desse repositório.
- **Compatibilidade:** use uma versão da API compatível com a versão do Self Drive deste repositório.

## Configuração e execução

Clone o repositório e instale as dependências:

```bash
git clone <URL_DO_REPOSITORIO>
cd self-drive
npm install
```

Inicie o Expo:

```bash
npm start
```

Também é possível iniciar diretamente para uma plataforma:

```bash
npm run android
npm run ios
npm run web
```

Abra o app no dispositivo ou emulador e toque no ícone de configurações da tela de login para informar o endereço do servidor. Por exemplo:

```text
https://arquivos.exemplo.com
```

Na rede local, use o endereço IP do computador ou servidor que o celular consiga acessar, incluindo a porta se necessário, por exemplo `192.168.1.20:3000`. `localhost` no celular aponta para o próprio celular, não para o computador que hospeda o servidor. Depois, entre com as credenciais de uma conta desse servidor.

O app aceita endereços `http://` e `https://`. Para uso fora de uma rede confiável, configure HTTPS no servidor.

## Desenvolvimento

Verifique o lint:

```bash
npm run lint
```

O projeto usa Expo Router. As telas ficam em `src/app/`; componentes, hooks e lógica compartilhada ficam em `src/components/`, `src/hooks/` e `src/lib/`.

## Builds com EAS

O projeto inclui perfis EAS de desenvolvimento, preview e produção no arquivo `eas.json`. Para criar builds na nuvem, configure sua conta e o projeto EAS e use:

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

O perfil `preview` gera um APK para distribuição interna no Android. O perfil `production` usa as configurações de distribuição de produção do EAS.

### Atualizações OTA

O app verifica atualizações EAS ao iniciar e também permite verificá-las manualmente em **Configurações → Atualizações do app**. Para publicar uma atualização de JavaScript ou assets no canal de produção:

```bash
npx eas-cli@latest update --channel production --message "Descreva a atualização"
```

Para distribuir no canal de testes, use `--channel preview`. Builds existentes precisam ser substituídas por uma nova build que inclua `expo-updates` antes de receber atualizações OTA. Mudanças em módulos nativos, plugins ou configuração nativa também exigem uma nova build; OTA cobre apenas JavaScript e assets compatíveis com o runtime instalado.

## Tecnologias

- React Native 0.86
- Expo SDK 57
- Expo Router
- JavaScript

## Licença

GPL-3.0. Consulte o arquivo `LICENSE` na versão do repositório publicada no GitHub para ver os termos completos.
