# Aurit no Android — versão de desenvolvimento

O projeto Android reaproveita o frontend React/Vite pelo Capacitor. O site continua
usando o build e o login existentes. O backend não foi alterado nesta etapa.

## Abrir no Android Studio

Abra a pasta `android` deste repositório (não crie outro projeto).

- Nome: **Aurit**.
- Application ID / pacote: **br.com.aurit.app**.
- Android mínimo: 7.0 (API 24).
- SDK de compilação e destino: 36.
- Node: 22 ou superior.
- Gradle JDK: **Java 21**. Se o Android Studio não detectar o Java local,
  selecione Java 21 em Settings > Build, Execution, Deployment > Build Tools > Gradle.
  O caminho pessoal do SDK e do Java fica fora do Git.

O identificador foi escolhido para iniciar o desenvolvimento. Confirme-o antes de
cadastrar clientes OAuth, assinar uma versão de produção ou publicar nas lojas.

## Atualizar as telas e executar

Na raiz do frontend:

```sh
npm install
npm run android:sync
npm run android:open
```

Selecione um emulador/dispositivo no Android Studio e clique em Run.
Alternativamente, `npm run android:run` sincroniza e executa pelo terminal.

`npm run mobile:build` usa `.env.android` e gera `dist-mobile`.
`npm run build` continua gerando o site em `dist`.
Depois de cada alteração de telas, execute `npm run android:sync`.

Para compilar um APK de desenvolvimento:

```sh
cd android
./gradlew assembleDebug
```

Saída: `android/app/build/outputs/apk/debug/app-debug.apk`.

## API e organização

`.env.android` aponta para `https://aurit-backend.onrender.com`, endereço já
registrado na documentação do backend. O build Android rejeita uma API sem HTTPS
ou apontando para localhost. Variáveis VITE são públicas: nunca coloque segredos.

O app carrega as telas do pacote local. Não usa `server.url` para abrir o site
remoto. HTTP sem TLS e conteúdo misto permanecem desativados.

No app, entre com usuário/e-mail e senha ou com Google. O cliente não precisa
saber o slug. O backend identifica a organização após validar as credenciais:

- Um vínculo autorizado: entrada automática.
- Vários vínculos: escolha pelo nome da organização, sem sessão até a escolha.
- Credenciais inválidas: mensagem genérica, sem revelar nomes de organizações.

O app usa `POST /usuarios/mobile/login` e `POST /usuarios/mobile/login/google`,
sem Bearer nem `X-Tenant-Slug` da sessão anterior. A resposta de sucesso informa
`empresaSlug`; o app o guarda internamente e o envia nas chamadas dos módulos.
Na escolha de organização, a chamada é repetida com `organizacaoSlug` e as
credenciais são revalidadas. Senha/ID Token pendentes ficam somente na memória,
até concluir, cancelar ou expirar a tela em cinco minutos. A recuperação usa
`POST /usuarios/mobile/esqueci-senha`, sem exigir organização e sem listar contas.

O login web permanece igual. No Android, o botão Google usa um plugin local
Capacitor com Credential Manager e Google Identity; o popup web não é executado
dentro da WebView. O acesso por senha reaproveita o contrato atual, inclusive
primeiro acesso e expiração da sessão.

O botão voltar Android navega pelo histórico; na tela inicial/login minimiza o app.
As barras do sistema recebem tratamento nativo de insets e o teclado usa resize.
O backup automático do aplicativo está desativado. Os logs da ponte nativa
também estão desativados para que respostas de autenticação não imprimam tokens.

## Google Login Android

O cliente Android informado foi cadastrado na configuração do backend:

- Cliente Android: `600786194492-jbh7o000m22284pdb67oumbum2hjqvjk.apps.googleusercontent.com`.
- Cliente web/servidor reaproveitado: `600786194492-32tnf0m5262pos3ajpikg5mk76pqnq35.apps.googleusercontent.com`.
- Pacote: `br.com.aurit.app`.
- SHA-1 de desenvolvimento: `C2:52:DE:C8:E4:6B:5A:1B:FA:0E:11:A0:61:2D:4B:95:F8:8A:98:DF`.

`capacitor.config.ts` configura `AuritGoogleAuth.serverClientId` com o **cliente
web**, como exige o SDK do Google. O cliente Android é identificado pelo pacote e
certificado cadastrados no Google Cloud; seu ID também é autorizado no backend.
Não substitua `serverClientId` pelo ID Android.

O plugin local `AuritGoogleAuthPlugin` usa o fluxo de botão
`GetSignInWithGoogleOption` do Credential Manager. A seleção de conta é aberta
pelo clique do usuário. O ID Token é enviado para
`POST /usuarios/mobile/login/google`, sem exigir organização previamente. O app só
aplica a sessão depois de receber o JWT próprio da Aurit do backend. O ID Token
Google não é persistido. Cancelar a seleção não cria sessão nem mostra erro.

No logout da Aurit, o aplicativo também limpa o estado de seleção de conta do
Credential Manager. Falha nessa limpeza não impede o encerramento local da sessão.

### Ativar no servidor existente

A nova configuração do backend tem os dois IDs exatos acima como lista padrão.
É necessário **publicar a nova versão do backend** para isso valer em produção.
Se `GOOGLE_LOGIN_MOBILE_CLIENT_IDS` já existir na hospedagem, ela substitui o
padrão, inclusive quando está vazia. Configure explicitamente:

```env
GOOGLE_LOGIN_MOBILE_CLIENT_IDS=600786194492-32tnf0m5262pos3ajpikg5mk76pqnq35.apps.googleusercontent.com,600786194492-jbh7o000m22284pdb67oumbum2hjqvjk.apps.googleusercontent.com
```

Não é preciso Firebase nem `google-services.json` para esse fluxo. O segredo
OAuth web permanece exclusivamente no backend. Nenhuma configuração foi alterada
no servidor remoto nesta etapa.

A conta Google precisa corresponder a um usuário ativo já cadastrado na
organização escolhida. Caso a tela de consentimento do projeto esteja em modo de
teste, inclua as contas necessárias em Público-alvo > Usuários de teste no Google Cloud.

Para a versão distribuída pela Google Play, cadastre também o certificado de
assinatura de produção/Play App Signing e autorize o cliente Android correspondente.
Para conferir o certificado local: `cd android` e `./gradlew signingReport`.

Referências: [Google Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation),
[certificados Android](https://developers.google.com/android/guides/client-auth).

## Validação realizada e limites

- TypeScript e builds web/Android aprovados.
- Gradle `assembleDebug` e `signingReport` aprovados.
- APK instalado e aberto no emulador API 37.
- Verificado na WebView real: ausência do campo de código, login automático,
  escolha por nome, recusa de credenciais, slug aplicado após autenticar, recuperação
  sem slug e primeiro acesso, com respostas simuladas.
- Botão voltar Android e primeiro acesso com token limitado aprovados com API simulada.
- Login Google web conferido em 360 e 1365 px: cliente web, authorization code
  e identificação da organização preservados, sem erros JavaScript.
- Plugin real abre o provedor Google Play Services no emulador; cancelamento sem sessão.
- Fluxo Google na WebView com SDK/API simulados: entrada sem slug, escolha de
  organização por nome, cancelamento, credencial inválida, conta recusada, primeiro
  acesso e logout.
- Google ID Token não persistido; somente JWT Aurit aplicado após resposta aprovada.
- Backend: 224 testes aprovados, incluindo descoberta após autenticar, seleção
  revalidada, isolamento de organizações, primeiro acesso e recuperação sem slug.
  Os testes anteriores dos clientes OAuth e dos tokens também continuam aprovados.
- Lint: zero erros; mesmos 42 avisos anteriores.

As verificações de login interceptaram a API com dados fictícios. Não houve login
real com conta Google, emissão de cobranças nem envio de mensagens. Publicação
do backend, teste com conta Google real, ícones/splash finais, armazenamento seguro
nativo da sessão, anexos, downloads, links externos e homologação completa ainda precisam ser concluídos
antes de distribuição. Esta etapa mantém o armazenamento de sessão existente do
frontend; desativar backup não o substitui por armazenamento seguro nativo.

Não foi criado projeto iOS: ele requer a preparação específica com Xcode.
Não houve commit, push ou publicação nesta etapa.
