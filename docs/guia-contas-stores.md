# Guia — Contas de store, CNPJ, domínio e email

> Escrito em 29/jul/2026 para o lançamento do "Você conhece Deus?". Valores e regras podem mudar; confirmar nos consoles na hora de executar.

## Decisões recomendadas (resumo)

> **Contexto de propriedade:** o VCD é produto **pessoal do Philipe**, não da RiviaDev (por enquanto). Isso descarta usar o CNPJ da RiviaDev: publicar sob o CNPJ dela tornaria o app um ativo da empresa — contas de store, contratos com Apple/Google, receita e papel de controlador LGPD ficariam no nome da RiviaDev, e "devolver" isso depois é transferência de ativo, não um clique.

| Pergunta | Recomendação |
|---|---|
| CNPJ próprio ou pessoa física? | **Abrir uma SLU própria do Philipe** (empresa unipessoal, sem sócio). Detalhes abaixo. |
| Comprar domínio já? | **Sim, hoje**, no seu CPF (transfere para o CNPJ depois). |
| Email Gmail próprio? | **Não para as contas de store.** Email no domínio (via encaminhamento gratuito) desde o início. |

## 1. Pessoa física × CNPJ próprio (sem a RiviaDev na jogada)

**Caminho recomendado: abrir uma SLU (Sociedade Limitada Unipessoal) sua.**
- Empresa de um dono só, sem sócio, patrimônio separado do seu CPF. Abertura em ~1–2 semanas na maioria dos estados (Junta digital), custo baixo + contador ~R$ 200–400/mês (Simples Nacional, CNAE de desenvolvimento de software, ex. 6201-5).
- Destrava as **contas de organização** nas duas stores: seller com nome de marca (não seu nome pessoal), isenção da exigência de teste fechado do Google (ver abaixo), D-U-N-S, e mais tarde Stripe/Pix e o acordo CADE — tudo já no lugar certo.
- Propriedade limpa: o app, a marca e a receita nascem num ativo **seu**, fácil de valorar se um dia entrar investidor — ou a própria RiviaDev.
- O prazo cabe folgado no cronograma: as contas de store só são necessárias de fato na Fase 3 (TestFlight/Play internal), e o D-U-N-S (que depende do CNPJ existir) roda em paralelo às Fases 1–2.

**Plano B — começar como pessoa física (se não quiser abrir empresa agora):**
- **Apple (individual, US$ 99/ano):** funciona, mas o app aparece na App Store com o **seu nome pessoal** como vendedor. A Apple permite migrar individual → organization depois (processo de suporte com D-U-N-S em mãos).
- **Google Play (pessoal, US$ 25):** contas pessoais novas precisam rodar **teste fechado com ~12 testadores opt-in por 14 dias** antes de produção. No nosso caso isso dói pouco — o plano já prevê beta fechado de 50–100 usuários na Fase 9, que cumpre o requisito naturalmente.
- Custos: nenhum fixo mensal. Riscos: seller com nome pessoal, receita tributada na pessoa física (carnê-leão — pior que Simples), controlador LGPD = você como PF, e uma migração de conta no meio do caminho quando profissionalizar.

**Resumo:** se o produto é para valer (e o plano de 6 meses diz que é), a SLU se paga. Pessoa física serve para não travar caso a abertura da empresa atrase — dá para começar o enrollment individual da Apple e migrar depois.

## 2. Domínio e email (fazer HOJE — desbloqueia todo o resto)

1. **Registrar `voceconhecedeus.com.br`** no [Registro.br](https://registro.br) (~R$ 40/ano) — **no seu CPF por enquanto**; o Registro.br permite transferir a titularidade para o CNPJ quando a SLU existir. Se disponível, registrar também **`voceconhecedeus.app`** (~US$ 15/ano; o TLD `.app` força HTTPS e é ótimo para universal links / deep links do app).
2. **DNS na Cloudflare** (plano gratuito): apontar os nameservers do Registro.br para a Cloudflare.
3. **Email sem custo via Cloudflare Email Routing**: criar `contato@`, `suporte@`, `dev@voceconhecedeus.com.br` como encaminhamentos para o seu Gmail. Isso basta para receber as verificações das stores.
   - Quando precisar **enviar** como o domínio (suporte respondendo usuários — exigência prática da Apple 1.2), assinar Google Workspace Starter (~R$ 35/mês) só para `suporte@`.
4. **Página mínima no domínio** (pode ser estática): quem somos + email de contato + política de privacidade (placeholder por enquanto). As verificações de organização da Apple e do Google **olham o site**; a política de privacidade será obrigatória na submissão.

**Não usar o Gmail pessoal como email da conta**: as duas stores validam credibilidade da organização por domínio próprio, e o email da conta vira o canal oficial de comunicação (rejeições, compliance, avisos legais). Use `dev@voceconhecedeus.com.br` (encaminhado para o seu Gmail — você lê no mesmo lugar).

## 3. Abrir a SLU e tirar o D-U-N-S (o caminho crítico)

1. **Abrir a SLU** (contador resolve; ~1–2 semanas): razão social pode ser neutra ("PH Zanetti Tecnologia Ltda") ou da marca; CNAE de desenvolvimento de software (6201-5/6209-1); Simples Nacional.
2. **Com o CNPJ em mãos, pedir o D-U-N-S** (Dun & Bradstreet — exigido pela Apple e pelo Google para contas de organização; gratuito): usar a [ferramenta de lookup/solicitação da Apple](https://developer.apple.com/enroll/duns-lookup/). Prazo típico: **1–4 semanas** para CNPJ brasileiro.
3. Os dados (razão social, endereço) devem bater **exatamente** com o cartão CNPJ — divergência é a causa nº 1 de atraso.

## 4. Apple Developer (organization) — passo a passo

1. Criar **Apple ID corporativo** com `dev@voceconhecedeus.com.br` + ativar 2FA (obrigatório).
2. Com o D-U-N-S em mãos: [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll) → **Company/Organization** → US$ 99/ano. Você precisa ter autoridade legal para assinar pela empresa (sócio-administrador serve).
3. A Apple pode ligar/emailar para confirmar a organização (dias a ~2 semanas).
4. Aprovado → **App Store Connect**: criar o app, reservar o nome **"Você conhece Deus?"** e o bundle ID `br.com.voceconhecedeus.app`.
5. **Imediatamente**: solicitar o **StoreKit External Purchase Link Entitlement (Brasil/CADE)** no formulário do developer account — a aprovação demora e o plano prevê checkout web/Pix na Fase 7. O app funciona 100% sem isso; é aditivo.
6. Deixar engatilhado para a submissão (Fase 8–9): questionário etário (16+), privacy nutrition labels, contato de suporte publicado, links de política de privacidade.

## 5. Google Play Console (organization) — passo a passo

1. [play.google.com/console/signup](https://play.google.com/console/signup) → conta de **organização** → taxa única de US$ 25.
2. Vai pedir: **D-U-N-S** da sua SLU, site no domínio próprio, email no domínio, e verificação de identidade do administrador (documento) + docs da empresa (cartão CNPJ).
3. Verificação leva de dias a ~2 semanas.
4. Criar o app, configurar a trilha de **internal testing** (usaremos desde a Fase 3).
5. Deixar engatilhado: **Health apps declaration** (check-ins de humor/sono/alimentação), formulário **Data Safety**, classificação de conteúdo (16+), e o formulário de **GenAI** (conteúdo gerado por IA com report in-app).

## 6. Ordem e prazos

| Quando | Ação | Prazo externo |
|---|---|---|
| Hoje | Domínio (CPF) + DNS Cloudflare + emails de encaminhamento + página mínima | horas |
| Hoje | Acionar contador para abrir a SLU | 1–2 semanas |
| Hoje | Criar Apple ID do produto (`dev@voceconhecedeus.com.br`) com 2FA | minutos |
| CNPJ ok | Pedir D-U-N-S | 1–4 semanas |
| D-U-N-S ok | Enrollment Apple organization (US$ 99/ano) | dias–2 sem |
| D-U-N-S ok | Play Console organization (US$ 25) | dias–2 sem |
| Apple ok | Reservar nome/bundle + pedir entitlement CADE | semanas (paralelo) |

Pior caso do caminho crítico (SLU 2 sem + D-U-N-S 4 sem + enrollment 2 sem ≈ 8 semanas) ainda chega antes da Fase 3 terminar. Se quiser seguro extra: iniciar o enrollment **individual** da Apple agora e migrar para organization quando o D-U-N-S sair.

Nada disso bloqueia o desenvolvimento: TestFlight/Play internal só entram na Fase 3, e os prazos acima cabem folgados dentro das ~5 semanas das Fases 1–2.
