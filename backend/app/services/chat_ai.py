import asyncio
import httpx
import json
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.creative import Creative
from app.models.campaign import Campaign
from app.models.sale import Sale
from app.models.settings import Settings
from app.models.lead import Lead
from app.core.config import settings as app_settings
from app.services.ai_creative import AICreativeService
from app.services.meta_ads import MetaAdsService
from app.services.market_research import MarketResearchService

SYSTEM_PROMPT = """Voce e o VendedorIA, um assistente ESPECIALISTA em marketing digital e vendas online com 15 anos de experiencia no mercado brasileiro.

Voce esta integrado a um sistema completo de vendas com capacidade de executar acoes automaticamente.

FLUXO DE ATENDIMENTO (siga esta ordem rigorosamente):

ETAPA 0 - BOAS-VINDAS E ONBOARDING:
Na PRIMEIRA mensagem do usuario (quando nao ha produtos cadastrados), apresente-se e explique o fluxo:

"Ola! 👋 Eu sou o VendedorIA, seu assistente de marketing digital!

Posso ajudar voce a:
✅ Cadastrar seus produtos
✅ Criar anuncios profissionais com textos e imagens geradas por IA
✅ Lancar campanhas em multiplas plataformas:
   📘 **Meta Ads** (Facebook + Instagram)
   🎵 **TikTok Ads**
   💬 **WhatsApp Business**
✅ Acompanhar metricas em tempo real

Para comecar, preciso saber sobre o produto que voce quer vender. Me conte: qual produto ou servico voce gostaria de anunciar?"

REQUISITOS POR PLATAFORMA:

META ADS (Facebook + Instagram):
1. Conta Meta conectada (Configuracoes > Conectar Meta)
2. Pagina do Facebook criada ([Criar Pagina](https://www.facebook.com/pages/creation/))
3. Conta de Anuncios ativa
4. Produto cadastrado
5. Criativo gerado E APROVADO
6. Metodo de pagamento na conta de anuncios ([Configurar Pagamento](https://www.facebook.com/ads/manager/account_settings/account_billing/))

TIKTOK ADS:
1. Produto cadastrado
2. Criativo gerado E APROVADO
(Integracao em modo demonstracao - credenciais TikTok Business serao necessarias para publicacao real)

WHATSAPP BUSINESS:
1. Credenciais WhatsApp configuradas (Configuracoes > WhatsApp Business)
2. Produto cadastrado
3. Contatos importados na aba WhatsApp

IMPORTANTE SOBRE PAGAMENTO:
Existem dois modelos de cobranca no Meta Ads:
- **Pos-pago (debito automatico)**: O mais comum. O Meta cobra automaticamente no cartao cadastrado apos os anuncios rodarem. Basta ter um cartao valido — NAO precisa adicionar fundos manualmente.
- **Pre-pago**: O usuario precisa adicionar fundos manualmente antes de rodar anuncios. Campanha so roda quando houver saldo disponivel.

CREDITOS PROMOCIONAIS DO META:
Cupons e creditos de boas-vindas do Meta sao gerenciados internamente pelo Facebook. Eles sao aplicados AUTOMATICAMENTE quando os anuncios rodam — o usuario NAO precisa fazer nada especial. Esses creditos nao aparecem como "saldo" na conta, mas sao abatidos do custo dos anuncios.

Para verificar creditos promocionais, o usuario pode acessar: [Gerenciador de Anuncios](https://adsmanager.facebook.com/)

Se o usuario perguntar "como comecar?" ou "o que preciso?", liste esses requisitos.
Se algum requisito estiver faltando ao tentar criar campanha, informe qual e como resolver.

ETAPA 1 - COLETA DE DADOS DO PRODUTO:
Pergunte UMA informacao por vez, nesta ordem:
1. O que o usuario quer vender? (nome do produto/servico)
2. Descricao detalhada do produto
3. Preco e tipo de cobranca (pagamento unico, mensal, anual, semanal)
4. Publico-alvo ideal (idade, perfil, interesses)
5. Diferenciais do produto (o que o torna unico)
6. Imagem do produto - pergunte: "Voce tem uma foto ou imagem do produto? Pode enviar aqui que uso nos anuncios! Se preferir, posso continuar sem."
7. URL do site/landing page - pergunte: "Qual o link do site ou pagina de vendas do seu produto? (ex: www.allize.com.br) Esse link sera usado nos anuncios para direcionar os clientes."

ETAPA 2 - CONFIRMACAO:
Apos coletar TODOS os dados, apresente um RESUMO ao usuario e peca confirmacao:
"Vou cadastrar seu produto com essas informacoes:
- Nome: ...
- Descricao: ...
- Preco: ...
- Publico: ...
- Diferenciais: ...
- Site: ...
Confirma?"

ETAPA 3 - CRIAR PRODUTO:
Somente apos o usuario confirmar, execute:
[ACTION:CREATE_PRODUCT] {"name": "...", "description": "...", "price": 0, "target_audience": "...", "differentials": "...", "pricing_type": "one_time|monthly|yearly|weekly", "recurrence_period": "...", "website_url": "https://..."}

ETAPA 3.5 - SELECAO DE PLATAFORMA:
Apos criar o produto com sucesso, pergunte ao usuario onde quer divulgar:

"Produto cadastrado com sucesso! Agora, onde voce quer divulgar?

1️⃣ **Meta Ads** (Facebook + Instagram) — Anuncios em Feed, Stories, Reels e Marketplace
2️⃣ **TikTok Ads** — Anuncios em video no TikTok (em breve - modo demonstracao)
3️⃣ **WhatsApp Business** — Campanhas de mensagens diretas para seus contatos

Qual plataforma voce prefere? (pode escolher mais de uma depois!)"

Baseado na escolha do usuario, siga o fluxo adequado:
- Meta Ads → ETAPA 4 (gerar criativos para Facebook/Instagram) → ETAPA 4.5 (preview + aprovacao) → ETAPA 5-META (criar campanha Meta)
- TikTok Ads → ETAPA 4 (gerar criativos para TikTok) → ETAPA 4.5 (preview + aprovacao) → ETAPA 5-TIKTOK (criar campanha TikTok)
- WhatsApp → ETAPA 5-WHATSAPP (criar campanha WhatsApp - nao precisa de criativo de imagem, usa template de mensagem)

ETAPA 4 - CRIATIVOS:
Apos o usuario escolher a plataforma (Meta Ads ou TikTok), gere criativos:
"Vou gerar um anuncio criativo (texto persuasivo + imagem gerada por IA) otimizado para [PLATAFORMA]. Quer que eu gere? Se nao gostar, pode pedir para regerar!"
Se sim: [ACTION:GENERATE_CREATIVES] {"product_id": ID_DO_PRODUTO}

ETAPA 4.5 - VALIDACAO E APROVACAO DO CRIATIVO (OBRIGATORIA):
Apos gerar os criativos, voce DEVE apresentar um PREVIEW DETALHADO e pedir APROVACAO EXPLICITA.

Apresente assim:
"Aqui esta o preview do seu anuncio! Revise cada detalhe:

📋 **TEXTO DO ANUNCIO:**
[Mostrar o copy_text do criativo selecionado/melhor]

🎯 **PUBLICO-ALVO CONFIGURADO:**
- Faixa etaria: [age_min]-[age_max] anos
- Localizacao: Brasil
- Interesses: [listar interesses baseados no produto]
- Posicionamento: Facebook Feed, Instagram Feed, Stories, Reels

🎨 **CRIATIVO:**
- Titulo: [headline do criativo]
- CTA (botao): [cta do criativo]
- Imagem: [image_url do criativo]

💰 **ORCAMENTO SUGERIDO:** R$[valor]/dia

📱 **PLATAFORMAS DE VEICULACAO:**
- Facebook (Feed, Stories, Marketplace, Reels)
- Instagram (Feed, Stories, Reels, Explore)
O Meta distribui automaticamente onde seu publico esta mais ativo.

Voce aprova este anuncio? Pode pedir alteracoes em qualquer parte:
- 'Mude o texto para...'
- 'Ajuste o publico para...'
- 'Mude o botao para...'
- 'Aprovo, pode criar a campanha!'"

O usuario PODE:
- Aprovar: "aprovado", "aprovado! pode criar a campanha", "pode criar", "esta bom", "ok", "confirmo"
- Pedir alteracoes: "mude o texto", "ajuste a imagem", "troque o botao"
- Rejeitar: "nao gostei", "gere outro criativo diferente", "tente novamente"

FLUXO CONTINUO APOS APROVACAO:
Quando o usuario aprovar o criativo (disser "aprovado", "pode criar", "ok", "sim", ou clicar no botao Aprovar que envia uma mensagem como "Aprovado! Pode criar a campanha com o criativo X para o produto Y"), crie a campanha IMEDIATAMENTE usando [ACTION:CREATE_CAMPAIGN] com o product_id e creative_id que voce ja tem. NAO faca mais perguntas - o usuario ja aprovou, entao va direto para a criacao da campanha.

BLOQUEIO TOTAL: NAO execute NENHUMA acao de criar campanha sem aprovacao explicita do criativo.
Se o usuario pedir para criar campanha sem ter aprovado um criativo, diga:
"Antes de criar a campanha, preciso que voce aprove pelo menos um dos criativos gerados. Qual deles voce mais gostou?"

IMPORTANTE:
- NAO execute [ACTION:CREATE_CAMPAIGN], [ACTION:CREATE_TIKTOK_CAMPAIGN] ou [ACTION:CREATE_WHATSAPP_CAMPAIGN] sem que o usuario diga explicitamente que APROVA/CONFIRMA o criativo (exceto WhatsApp que usa template de texto)
- Se o usuario pedir alteracoes, ajuste e apresente o preview novamente
- Somente apos receber aprovacao explicita (ex: "aprovo", "pode criar", "esta bom", "ok", "confirmo"), execute a acao de criar campanha

ETAPA 5-META - CAMPANHA META ADS (SOMENTE APOS APROVACAO DO PREVIEW):
Somente execute esta etapa se o usuario JA APROVOU o preview na etapa 4.5 e escolheu Meta Ads.

Antes de criar a campanha, VERIFIQUE o status da integracao Meta Ads abaixo.

Se o Meta Ads NAO esta pronto (veja STATUS META ADS abaixo), guie o usuario pelo processo de configuracao de forma amigavel e passo a passo. NAO tente criar a campanha sem todos os pre-requisitos atendidos.

Se o Meta Ads esta totalmente pronto e o usuario JA APROVOU o preview:
Diga: "Sua campanha sera veiculada no **Facebook** e **Instagram** automaticamente."
[ACTION:CREATE_CAMPAIGN] {"product_id": ID, "creative_id": ID, "daily_budget": 50}

ETAPA 5-TIKTOK - CAMPANHA TIKTOK ADS (SOMENTE APOS APROVACAO DO PREVIEW):
Se o usuario escolheu TikTok e JA APROVOU o preview na etapa 4.5:
"Sua campanha TikTok esta sendo preparada!"
[ACTION:CREATE_TIKTOK_CAMPAIGN] {"product_id": ID, "creative_id": ID, "daily_budget": 50}

NOTA: A integracao TikTok esta em modo demonstracao. A campanha sera criada localmente para preview. Quando as credenciais TikTok forem configuradas, sera possivel publicar diretamente.

ETAPA 5-WHATSAPP - CAMPANHA WHATSAPP BUSINESS:
Se o usuario escolheu WhatsApp:
Pergunte:
1. "Para quem voce quer enviar? (voce pode importar contatos na aba WhatsApp)"
2. "Qual a mensagem que quer enviar? Posso sugerir uma baseada no seu produto:"
   Sugira uma mensagem personalizada usando os dados do produto com variaveis {nome}, {produto}, {preco}
3. "Quando quer enviar? Agora ou agendar?"

Quando tiver todas as informacoes:
[ACTION:CREATE_WHATSAPP_CAMPAIGN] {"product_id": ID, "message_template": "texto", "campaign_name": "nome"}

ETAPA 6 - ESTRATEGIA (opcional):
Se o usuario pedir, gere uma estrategia de marketing:
[ACTION:GENERATE_STRATEGY] {"product_id": ID}

ONBOARDING META ADS - GUIA PASSO A PASSO:
Quando o usuario quiser criar uma campanha Meta Ads mas a integracao nao estiver completa, guie-o de forma AMIGAVEL e CLARA, um passo de cada vez. Use o STATUS META ADS (injetado abaixo) para saber o que falta.

Passos para configurar (guie apenas o que estiver faltando):

1. **Criar conta Meta Business** (se nao tem):
   "Para anunciar no Facebook e Instagram, voce precisa de uma conta Meta Business. E super rapido:
   1. Acesse business.facebook.com
   2. Clique em 'Criar conta'
   3. Siga o passo a passo (leva 2 minutos!)
   Me avise quando tiver criado!"

2. **Configurar App ID e App Secret** (se has_app_credentials = false):
   "Agora preciso que voce configure as credenciais do app Meta no sistema:
   1. Acesse developers.facebook.com
   2. Crie um app do tipo 'Business'
   3. Copie o App ID e App Secret
   4. Va em **Configuracoes** (icone de engrenagem) > **Credenciais** > **Meta Ads**
   5. Cole o App ID e App Secret la
   Me avise quando tiver feito!"

3. **Conectar conta Meta** (se is_connected = false):
   "Otimo! Agora preciso que voce conecte sua conta Facebook ao sistema:
   1. Va em **Configuracoes** (icone de engrenagem) > **Meta Ads**
   2. Clique no botao **Conectar com Facebook**
   3. Autorize as permissoes solicitadas
   Me avise quando conectar!"

4. **Selecionar conta de anuncios** (se has_ad_account = false):
   "Perfeito! Agora selecione sua conta de anuncios:
   1. Va em **Configuracoes** > **Meta Ads**
   2. Na secao 'Conta de Anuncios', selecione a conta que deseja usar
   Se nao aparecer nenhuma conta, voce precisa criar uma no business.facebook.com"

5. **Pagina do Facebook** (se has_page = false):
   "Quase la! Para criar anuncios, voce precisa de uma Pagina do Facebook:
   1. Acesse [Criar Pagina do Facebook](https://www.facebook.com/pages/creation/)
   2. Crie uma pagina para seu negocio
   3. Depois, va em **Configuracoes** > **Meta Ads** e reconecte sua conta para sincronizar a pagina
   Me avise quando a pagina estiver pronta!"

6. **Metodo de pagamento** (se has_payment = false):
   "Ultimo passo! Voce precisa adicionar um metodo de pagamento na sua conta de anuncios:
   1. Acesse [Configurar Pagamento](https://www.facebook.com/ads/manager/account_settings/account_billing/)
   2. Adicione um cartao de credito ou outro metodo de pagamento
   Sem isso, o Facebook nao vai veicular seus anuncios. Me avise quando adicionar!"

IMPORTANTE: Guie apenas UM passo de cada vez. Quando o usuario confirmar que completou um passo, verifique o proximo. Seja paciente e encorajador.

LINKS EXTERNOS (sempre use formato markdown para links):
- Pagamento: [Configurar Pagamento](https://www.facebook.com/ads/manager/account_settings/account_billing/)
- Criar Pagina: [Criar Pagina do Facebook](https://www.facebook.com/pages/creation/)
- Business Manager: [Meta Business Suite](https://business.facebook.com/)
- Ads Manager: [Gerenciador de Anuncios](https://adsmanager.facebook.com/)
- Adicionar Fundos: [Adicionar Fundos na Conta](https://www.facebook.com/ads/manager/account_settings/account_billing/)

IMPORTANTE: Sempre use o formato [texto](url) para links externos. O chat renderiza como botao clicavel.

REGRAS IMPORTANTES:
- SEMPRE use [ACTION:...] para acoes (em ingles). NUNCA use [AÇÃO:...] ou [ACAO:...] em portugues. O sistema so reconhece [ACTION:...].
- Fale em portugues brasileiro, seja assertivo e amigavel
- Faca UMA pergunta por vez - nao sobrecarregue
- NUNCA execute uma acao sem ter TODOS os dados necessarios
- SEMPRE mostre resumo e peca confirmacao antes de criar produto
- Se o usuario enviar uma imagem, reconheca e use como foto do produto
- Sugira orcamentos baseado na sua experiencia (R$30-50/dia para comecar)
- Mostre entusiasmo quando uma etapa for concluida
- Use os IDs retornados nas acoes anteriores para as proximas (ex: product_id do CREATE_PRODUCT para GENERATE_CREATIVES)
- Quando uma acao e executada com sucesso, o resultado aparece no historico como [RESULTADO DA ACAO: tipo | dados: {...}]. SEMPRE use os IDs reais desses resultados nas acoes seguintes. Por exemplo, se CREATE_PRODUCT retornou product_id=5, use 5 no GENERATE_CREATIVES.
- NUNCA use placeholders como ID_DO_PRODUTO ou ID_DO_CRIATIVO. Sempre use os numeros reais dos resultados anteriores.
- Se uma acao falhou anteriormente (ex: erro ao criar campanha, erro de API) e o usuario pedir para "tentar novamente" ou "tente agora", voce DEVE re-executar a mesma acao usando a tag [ACTION:...] com os mesmos parametros. NAO fique apenas conversando sobre o erro - execute a acao novamente.

PRODUTOS EXISTENTES:
- Se o usuario mencionar um produto que JA esta cadastrado (listado abaixo no contexto), NAO repita a coleta de dados
- Use os dados do produto existente e pergunte diretamente o que ele quer fazer: gerar criativos, criar campanha, ou gerar estrategia
- Se o produto ja tem criativos gerados, informe o usuario e pergunte se quer gerar novos ou usar os existentes
- Se o produto ja tem campanha, informe o status e pergunte se quer criar uma nova campanha ou ajustar a existente
- Use SEMPRE o ID real do produto cadastrado nas acoes

EDITAR PRODUTO EXISTENTE:
Quando o usuario quiser alterar/editar/atualizar alguma informacao de um produto ja cadastrado:
1. Pergunte qual produto (mostre a lista dos produtos cadastrados abaixo)
2. Pergunte o que deseja alterar
3. Confirme as alteracoes com o usuario
4. Execute a acao incluindo APENAS os campos que estao sendo alterados:
[ACTION:UPDATE_PRODUCT] {"product_id": ID, "name": "...", "description": "...", "price": 0, "target_audience": "...", "differentials": "...", "pricing_type": "...", "recurrence_period": "..."}
IMPORTANTE: Inclua apenas o product_id (obrigatorio) e os campos que o usuario quer alterar. Nao inclua campos que nao foram mencionados.

REMOVER PRODUTO:
Quando o usuario quiser remover/deletar/excluir um produto:
1. Pergunte qual produto deseja remover (mostre a lista)
2. CONFIRME com o usuario antes de remover - esta acao e irreversivel!
3. Somente apos confirmacao, execute:
[ACTION:DELETE_PRODUCT] {"product_id": ID}

COMANDOS RAPIDOS (informe ao usuario quando perguntar o que pode fazer):
- "cadastrar produto" → Inicia fluxo de cadastro (ETAPA 1)
- "criar campanha" → Pergunta a plataforma e cria campanha
- "campanha meta" → Cria campanha Meta Ads (Facebook + Instagram)
- "campanha tiktok" → Cria campanha TikTok Ads
- "campanha whatsapp" → Cria campanha WhatsApp Business
- "ver campanhas" → Lista campanhas ativas
- "editar produto [nome]" → Altera dados do produto
- "remover produto [nome]" → Remove produto
- "gerar criativos" → Gera novos criativos para produto
- "status" → Mostra status das campanhas
- "ajuda" → Mostra comandos disponiveis

PRIMEIRA MENSAGEM: Apresente-se brevemente como VendedorIA e pergunte o que o usuario quer vender."""


class ChatAIService:
    def __init__(self, ai_api_key: str = "", ai_provider: str = "claude", meta_configured: bool = True, whatsapp_configured: bool = True, meta_readiness: dict = None):
        self.ai_api_key = app_settings.OPENAI_API_KEY or app_settings.TOGETHER_API_KEY
        self.ai_provider = "openai" if app_settings.OPENAI_API_KEY else "together"
        self.meta_configured = meta_configured
        self.whatsapp_configured = whatsapp_configured
        self.meta_readiness = meta_readiness or {}

    async def process_message(
        self,
        user_message: str,
        history: List[Dict],
        db: Session,
        attachment_path: str = None,
        user_id: int = 0,
    ) -> Tuple[str, Optional[str], Optional[str], bool, Optional[str]]:
        """
        Process user message and return (response_text, action_taken, action_data, ai_fallback, error_detail).
        Uses Claude API or smart fallback.
        """

        # Build messages for AI
        messages = []
        for msg in history[-20:]:  # last 20 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})

        user_content = user_message
        if attachment_path:
            user_content += f"\n[Usuario enviou um arquivo: {attachment_path}]"

        messages.append({"role": "user", "content": user_content})

        # Try AI API
        ai_response, ai_fallback, error_detail = await self._call_ai(messages, db)

        # Normalize Portuguese action tags to English (AI sometimes generates [AÇÃO:...] instead of [ACTION:...])
        ai_response = ai_response.replace("[AÇÃO:", "[ACTION:").replace("[ACAO:", "[ACTION:")

        # Check for actions in response
        action_taken = None
        action_data = None

        if "[ACTION:CREATE_PRODUCT]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "CREATE_PRODUCT", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:GENERATE_CREATIVES]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "GENERATE_CREATIVES", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:CREATE_CAMPAIGN]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "CREATE_CAMPAIGN", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:GENERATE_STRATEGY]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "GENERATE_STRATEGY", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:UPDATE_PRODUCT]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "UPDATE_PRODUCT", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:DELETE_PRODUCT]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "DELETE_PRODUCT", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:CREATE_WHATSAPP_CAMPAIGN]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "CREATE_WHATSAPP_CAMPAIGN", db, attachment_path=attachment_path, user_id=user_id
            )
        elif "[ACTION:CREATE_TIKTOK_CAMPAIGN]" in ai_response:
            action_taken, action_data, ai_response = await self._execute_action(
                ai_response, "CREATE_TIKTOK_CAMPAIGN", db, attachment_path=attachment_path, user_id=user_id
            )

        return ai_response, action_taken, action_data, ai_fallback, error_detail

    def _build_system_prompt(self, db: Session = None) -> str:
        """Build system prompt with conditional config warnings and database context."""
        prompt = SYSTEM_PROMPT

        # Inject Meta Ads readiness status
        r = self.meta_readiness
        if r:
            meta_status = "\n\nSTATUS META ADS (use para guiar o usuario):"
            meta_status += f"\n- Credenciais do app (App ID/Secret): {'Configurado' if r.get('has_app_credentials') else 'NAO configurado'}"
            meta_status += f"\n- Conta conectada: {'Sim - {}'.format(r.get('user_name', '')) if r.get('is_connected') else 'NAO conectada'}"
            meta_status += f"\n- Conta de anuncios: {'Selecionada ({})'.format(r.get('ad_account_id', '')) if r.get('has_ad_account') else 'NAO selecionada'}"
            meta_status += f"\n- Pagina do Facebook: {'Configurada' if r.get('has_page') else 'NAO configurada'}"
            # Payment status with prepaid detection
            if not r.get('has_ad_account'):
                meta_status += "\n- Metodo de pagamento: Verificar (sem conta de anuncios)"
            elif r.get('has_payment'):
                if r.get('is_prepaid'):
                    balance = r.get('balance', 0)
                    if balance > 0:
                        meta_status += f"\n- Metodo de pagamento: Configurado (Pre-pago, saldo: R${balance:.2f})"
                    else:
                        meta_status += f"\n- Metodo de pagamento: Cartao configurado, MAS saldo R$0,00. Conta PRE-PAGA - usuario precisa ADICIONAR FUNDOS em [Adicionar Fundos](https://www.facebook.com/ads/manager/account_settings/account_billing/)"
                else:
                    meta_status += "\n- Metodo de pagamento: Configurado (Debito automatico no cartao). Creditos promocionais do Meta sao aplicados automaticamente."
            else:
                meta_status += "\n- Metodo de pagamento: NAO configurado - [Configurar Pagamento](https://www.facebook.com/ads/manager/account_settings/account_billing/)"

            has_funds = r.get('has_sufficient_funds', r.get('has_payment', False))
            all_ready = r.get('has_app_credentials') and r.get('is_connected') and r.get('has_ad_account') and r.get('has_page') and has_funds
            if all_ready:
                meta_status += "\n- STATUS GERAL: PRONTO para criar campanhas!"
            else:
                meta_status += "\n- STATUS GERAL: INCOMPLETO - guie o usuario pelos passos faltantes antes de criar campanha"
            prompt += meta_status
        elif not self.meta_configured:
            prompt += "\n\nIMPORTANTE: As credenciais do Meta Ads NAO estao configuradas. Se o usuario pedir para criar campanha no Meta/Facebook/Instagram, guie-o pelo processo de configuracao passo a passo."

        if self.whatsapp_configured:
            prompt += "\n\nSTATUS WHATSAPP BUSINESS: Configurado e pronto para campanhas."
        else:
            prompt += "\n\nSTATUS WHATSAPP BUSINESS: NAO configurado. Instrua o usuario a ir em Configuracoes > Credenciais > WhatsApp Business."

        # TikTok status (always demo for now)
        prompt += "\n\nSTATUS TIKTOK ADS: Modo demonstracao. Campanhas sao salvas localmente. Integracao completa em desenvolvimento."

        # Inject existing products, creatives, and campaigns from database
        if db:
            try:
                products = db.query(Product).order_by(Product.created_at.desc()).limit(20).all()
                if products:
                    prompt += "\n\nPRODUTOS JA CADASTRADOS NO SISTEMA:"
                    for p in products:
                        price_str = f"R${p.price:.2f}"
                        if p.pricing_type == "monthly":
                            price_str += "/mes"
                        elif p.pricing_type == "yearly":
                            price_str += "/ano"
                        elif p.pricing_type == "weekly":
                            price_str += "/semana"
                        prompt += f"\n- ID: {p.id} | Nome: {p.name} | Descricao: {p.description or 'N/A'} | Preco: {price_str} | Publico: {p.target_audience or 'N/A'} | Diferenciais: {p.differentials or 'N/A'} | Site: {p.website_url or 'N/A'}"

                # Load creatives grouped by product
                creatives = db.query(Creative).order_by(Creative.id.desc()).limit(30).all()
                if creatives:
                    prompt += "\n\nCRIATIVOS EXISTENTES:"
                    from collections import defaultdict
                    by_product = defaultdict(list)
                    for c in creatives:
                        by_product[c.product_id].append(c)
                    for pid, clist in by_product.items():
                        product = db.query(Product).filter(Product.id == pid).first()
                        pname = product.name if product else f"Produto {pid}"
                        statuses = [c.status for c in clist]
                        prompt += f"\n- Produto \"{pname}\" (ID {pid}): {len(clist)} criativos (IDs: {', '.join(str(c.id) for c in clist)}, status: {', '.join(set(statuses))})"

                # Load campaigns
                campaigns = db.query(Campaign).order_by(Campaign.id.desc()).limit(20).all()
                if campaigns:
                    prompt += "\n\nCAMPANHAS EXISTENTES:"
                    for camp in campaigns:
                        product = db.query(Product).filter(Product.id == camp.product_id).first()
                        pname = product.name if product else f"Produto {camp.product_id}"
                        prompt += f"\n- ID: {camp.id} | \"{camp.name}\" | Produto: {pname} (ID {camp.product_id}) | Plataforma: {camp.platform} | Status: {camp.status} | Orcamento: R${camp.daily_budget}/dia"
            except Exception as e:
                print(f"Error loading DB context for prompt: {e}")

        return prompt

    def _parse_api_error(self, provider: str, status_code: int, response_text: str) -> str:
        """Parse API error into user-friendly Portuguese message."""
        import json as _json

        # Try to extract error message from response body
        detail = ""
        try:
            error_data = _json.loads(response_text)
            if "error" in error_data:
                err = error_data["error"]
                if isinstance(err, dict):
                    detail = err.get("message", "")
                else:
                    detail = str(err)
        except Exception:
            detail = response_text[:200] if response_text else ""

        error_messages = {
            401: f"**Chave de API {provider} invalida.** Verifique se a chave esta correta nas Configuracoes.",
            403: f"**Acesso negado pela API {provider}.** Sua chave pode nao ter as permissoes necessarias.",
            429: f"**Limite excedido ou billing inativo na {provider}.** ",
            500: f"**Erro interno do servidor {provider}.** Tente novamente em alguns instantes.",
            502: f"**Servidor {provider} temporariamente indisponivel.** Tente novamente em alguns instantes.",
            503: f"**Servico {provider} temporariamente indisponivel.** Tente novamente em alguns instantes.",
        }

        base_msg = error_messages.get(status_code, f"**Erro {status_code} da API {provider}.**")

        # For 429, add specific detail about billing
        if status_code == 429 and "billing" in detail.lower():
            base_msg += "Sua conta nao tem billing ativo. Acesse o painel da " + provider + " para ativar."
        elif status_code == 429:
            base_msg += "Aguarde um momento e tente novamente."

        if detail and status_code not in [429]:
            base_msg += f"\n\n*Detalhe: {detail}*"

        return base_msg

    async def _try_openai(self, messages: List[Dict], system_prompt: str, api_key: str) -> Optional[Tuple[str, bool, Optional[str]]]:
        """Try OpenAI GPT-4o-mini. Returns result tuple on success, None on failure."""
        try:
            openai_messages = [{"role": "system", "content": system_prompt}]
            openai_messages.extend(messages)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "max_tokens": 2000,
                        "messages": openai_messages,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return (data["choices"][0]["message"]["content"], False, None)
                else:
                    print(f"OpenAI API error {response.status_code}: {response.text[:300]}")
                    return None
        except Exception as e:
            print(f"OpenAI connection error: {e}")
            return None

    async def _try_together(self, messages: List[Dict], system_prompt: str, api_key: str) -> Optional[Tuple[str, bool, Optional[str]]]:
        """Try Together AI Llama. Returns result tuple on success, None on failure."""
        try:
            together_messages = [{"role": "system", "content": system_prompt}]
            together_messages.extend(messages)

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.together.xyz/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                        "max_tokens": 2000,
                        "messages": together_messages,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return (data["choices"][0]["message"]["content"], False, None)
                else:
                    print(f"Together AI API error {response.status_code}: {response.text[:300]}")
                    return None
        except Exception as e:
            print(f"Together AI connection error: {e}")
            return None

    async def _try_claude(self, messages: List[Dict], system_prompt: str, api_key: str) -> Optional[Tuple[str, bool, Optional[str]]]:
        """Try Claude API. Returns result tuple on success, None on failure."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 2000,
                        "system": system_prompt,
                        "messages": messages,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return (data["content"][0]["text"], False, None)
                else:
                    print(f"Claude API error {response.status_code}: {response.text[:300]}")
                    return None
        except Exception as e:
            print(f"Claude connection error: {e}")
            return None

    async def _call_ai(self, messages: List[Dict], db: Session = None) -> Tuple[str, bool, Optional[str]]:
        """Call AI API with fallback. OpenAI is primary, Together AI is fallback.
        Returns (text, is_fallback, error_detail)."""
        system_prompt = self._build_system_prompt(db)

        # Try primary provider
        result = None
        if self.ai_api_key:
            if self.ai_provider == "openai":
                result = await self._try_openai(messages, system_prompt, self.ai_api_key)
            elif self.ai_provider == "together":
                result = await self._try_together(messages, system_prompt, self.ai_api_key)
            elif self.ai_provider == "claude":
                result = await self._try_claude(messages, system_prompt, self.ai_api_key)

        if result:
            return result

        # Primary failed — try fallback provider
        if self.ai_provider == "openai":
            fallback_key = app_settings.TOGETHER_API_KEY
            if fallback_key:
                print(f"Primary AI (OpenAI) failed, trying Together AI fallback")
                result = await self._try_together(messages, system_prompt, fallback_key)
        elif self.ai_provider == "together":
            fallback_key = app_settings.OPENAI_API_KEY
            if fallback_key:
                print(f"Primary AI (Together) failed, trying OpenAI fallback")
                result = await self._try_openai(messages, system_prompt, fallback_key)

        if result:
            return result

        # Both failed or no API keys configured
        if not self.ai_api_key:
            return (
                "A inteligencia artificial nao esta configurada. "
                "Por favor, va em Configuracoes e preencha sua chave de API.",
                True,
                None,
            )

        error_msg = "Todos os provedores de IA falharam. Tente novamente em alguns instantes."
        return (error_msg, False, error_msg)

    async def _execute_action(
        self, response: str, action_type: str, db: Session, attachment_path: str = None, user_id: int = 0
    ) -> Tuple[str, str, str]:
        """Extract and execute action from AI response."""
        import re

        action_tag = f"[ACTION:{action_type}]"
        action_start = response.find(action_tag)

        if action_start == -1:
            return None, None, response

        # Extract JSON after the tag
        json_start = response.find("{", action_start)
        json_end = response.find("}", json_start) + 1

        if json_start == -1 or json_end <= json_start:
            return None, None, response

        try:
            action_params = json.loads(response[json_start:json_end])
        except json.JSONDecodeError:
            # Strip the raw action tag so it doesn't show in chat
            clean = response[:action_start].strip()
            if not clean:
                clean = "Desculpe, houve um erro ao processar a acao. Pode tentar novamente?"
            return None, None, clean

        # Remove action tag from response
        clean_response = response[:action_start] + response[json_end:]
        clean_response = clean_response.replace(action_tag, "").strip()

        # Execute the action
        if action_type == "CREATE_PRODUCT":
            product = Product(
                name=action_params.get("name", "Novo Produto"),
                description=action_params.get("description", ""),
                price=action_params.get("price", 0),
                target_audience=action_params.get("target_audience", ""),
                differentials=action_params.get("differentials", ""),
                pricing_type=action_params.get("pricing_type", "one_time"),
                recurrence_period=action_params.get("recurrence_period"),
                website_url=action_params.get("website_url", ""),
                user_id=user_id,
            )
            # Save product image if user uploaded one
            if attachment_path and any(ext in attachment_path.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                product.image_path = attachment_path
            db.add(product)
            db.commit()
            db.refresh(product)
            if not clean_response.strip():
                clean_response = f"Produto **{product.name}** (ID: {product.id}) cadastrado com sucesso!\n\nAgora, onde voce quer divulgar?\n\n1. **Meta Ads** (Facebook + Instagram)\n2. **TikTok Ads** (modo demonstracao)\n3. **WhatsApp Business**\n\nQual plataforma voce prefere?"
            return (
                "product_created",
                json.dumps({"product_id": product.id, "name": product.name}),
                clean_response,
            )

        elif action_type == "GENERATE_CREATIVES":
            product_id = action_params.get("product_id")
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                # Delete old creatives for this product to avoid accumulation
                old_creatives = db.query(Creative).filter(Creative.product_id == product.id).all()
                for old_c in old_creatives:
                    db.delete(old_c)
                db.commit()

                settings = db.query(Settings).filter(Settings.user_id == user_id).first() if user_id else db.query(Settings).first()
                ai_key = app_settings.TOGETHER_API_KEY
                service = AICreativeService(
                    ai_api_key=ai_key,
                    image_api_key=settings.image_api_key if settings and settings.image_api_key else app_settings.TOGETHER_API_KEY,
                )
                variations = await service.generate_copy(
                    product.name,
                    product.description or "",
                    product.price,
                    product.target_audience or "",
                    product.differentials or "",
                    product.pricing_type or "one_time",
                    product.recurrence_period or "",
                )
                platform = action_params.get("platform", "instagram")
                placement = action_params.get("placement", "feed")
                created_ids = []
                for i, v in enumerate(variations[:1]):
                    image_url = await service.generate_and_save_image(
                        v.get("image_prompt", product.name), product.name
                    )
                    creative = Creative(
                        product_id=product.id,
                        variation=i + 1,
                        headline=v.get("headline", ""),
                        copy_text=v.get("copy_text", ""),
                        cta=v.get("cta", ""),
                        image_url=image_url,
                        image_prompt=v.get("image_prompt", ""),
                        status="pending",
                        platform=platform,
                        format_type="image",
                        placement=placement,
                        user_id=user_id,
                    )
                    db.add(creative)
                    db.commit()
                    db.refresh(creative)
                    created_ids.append(creative.id)
                # Build creative preview data for inline display in chat
                creative_previews = []
                for cid in created_ids:
                    c = db.query(Creative).filter(Creative.id == cid).first()
                    if c:
                        creative_previews.append({
                            "id": c.id,
                            "headline": c.headline,
                            "copy_text": c.copy_text,
                            "cta": c.cta,
                            "image_url": c.image_url,
                        })

                if not clean_response.strip():
                    clean_response = "Pronto! Aqui esta o criativo que gerei para o seu anuncio:"
                return (
                    "creatives_generated",
                    json.dumps({
                        "creative_ids": created_ids,
                        "product_id": product_id,
                        "previews": creative_previews,
                    }),
                    clean_response,
                )
            return None, None, clean_response

        elif action_type == "CREATE_CAMPAIGN":
            # Pre-flight validation with friendly messages
            r = self.meta_readiness
            missing = []
            if r:
                if not r.get("has_app_credentials"):
                    missing.append("Credenciais do app Meta (App ID e App Secret)")
                if not r.get("is_connected"):
                    missing.append("Conexao com conta Facebook")
                if not r.get("has_ad_account"):
                    missing.append("Conta de anuncios selecionada")
                if not r.get("has_page"):
                    missing.append("Pagina do Facebook vinculada")

            if missing or not self.meta_configured:
                if missing:
                    items = "\n".join(f"- {m}" for m in missing)
                    error_msg = (
                        f"Quase la! Para criar a campanha, ainda falta configurar:\n\n{items}\n\n"
                        "Vou te guiar passo a passo. Vamos comecar pelo primeiro item?"
                    )
                else:
                    error_msg = (
                        "Nao foi possivel criar a campanha. As credenciais do Meta Ads nao estao configuradas.\n\n"
                        "Para configurar, va em **Configuracoes** > **Credenciais** > **Meta Ads** e preencha:\n"
                        "- App ID\n"
                        "- Access Token\n"
                        "- Ad Account ID\n\n"
                        "Depois de configurar, me avise que eu crio a campanha!"
                    )
                clean_response = error_msg
                return None, None, clean_response

            # Check Facebook Page specifically (required for ad creatives)
            settings_obj = db.query(Settings).filter(Settings.user_id == user_id).first() if user_id else db.query(Settings).first()
            if not settings_obj or not settings_obj.facebook_page_id:
                error_msg = (
                    "**Quase la!** Para criar anuncios no Meta Ads, voce precisa de uma **Pagina do Facebook** vinculada.\n\n"
                    "Siga estes passos:\n"
                    "1. Acesse [Criar Pagina do Facebook](https://www.facebook.com/pages/creation/) e crie uma pagina para seu negocio\n"
                    "2. Depois, va em **Configuracoes** > **Meta Ads** e clique em **Reconectar** para sincronizar a pagina\n"
                    "3. Me avise quando estiver pronto que eu crio a campanha!\n\n"
                    "Sem a pagina, o Facebook nao permite criar anuncios."
                )
                return None, None, error_msg

            product_id = action_params.get("product_id")
            creative_id = action_params.get("creative_id")
            daily_budget = action_params.get("daily_budget", 50)
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                settings = db.query(Settings).filter(Settings.user_id == user_id).first() if user_id else db.query(Settings).first()
                meta_service = MetaAdsService(
                    access_token=settings.meta_access_token if settings else "",
                    ad_account_id=settings.meta_ad_account_id if settings else "",
                    page_id=settings.facebook_page_id if settings else "",
                )

                # Pre-campaign info: if mock mode, inform the user
                if meta_service.is_mock:
                    clean_response = (
                        "Configure suas credenciais Meta nas **Configuracoes** para criar campanhas reais."
                    )
                    return None, None, clean_response

                targeting = meta_service.suggest_targeting(
                    product.name, product.target_audience or "", product.price
                )

                # Get creative data for the ad
                ad_message = f"Conheca {product.name}! {product.description or ''}"
                ad_headline = product.name
                ad_image_url = ""
                ad_cta = "LEARN_MORE"

                # Try to get creative data from the selected creative or latest one
                creative_obj = None
                if creative_id:
                    creative_obj = db.query(Creative).filter(Creative.id == creative_id).first()
                if not creative_obj:
                    # Get latest creative for this product
                    creative_obj = db.query(Creative).filter(
                        Creative.product_id == product.id
                    ).order_by(Creative.id.desc()).first()

                if creative_obj:
                    ad_message = creative_obj.copy_text or ad_message
                    ad_headline = creative_obj.headline or ad_headline
                    ad_image_url = creative_obj.image_url or ""
                    ad_cta = creative_obj.cta or "LEARN_MORE"

                # Get product website URL for the ad link
                ad_link = product.website_url or "https://example.com"

                # Create full campaign (Campaign + Ad Set + Creative + Ad)
                full_result = await meta_service.create_full_campaign(
                    campaign_name=f"Campanha - {product.name}",
                    targeting=targeting,
                    daily_budget=daily_budget,
                    ad_message=ad_message,
                    ad_headline=ad_headline,
                    ad_image_url=ad_image_url,
                    ad_cta=ad_cta,
                    ad_link=ad_link,
                )

                # Check for errors
                if full_result.get("errors"):
                    error_list = "\n".join(f"- {e}" for e in full_result["errors"])

                    # Detect development mode error
                    for err_msg in full_result["errors"]:
                        err_lower = str(err_msg).lower()
                        if "modo de desenvolvimento" in err_lower or "development mode" in err_lower or "1487930" in str(err_msg):
                            # Return a simple development mode error message
                            clean_response = (
                                "Seu app Meta precisa de uma configuracao rapida para criar anuncios reais.\n\n"
                                "Acesse o link abaixo, clique no seu app e ative o modo 'Live' no topo da pagina:\n\n"
                                "[ACTION_BUTTON:Abrir Meta Developers:https://developers.facebook.com/apps/]\n\n"
                                "Depois volte aqui e me diga 'criar campanha' novamente."
                            )
                            return (
                                "development_mode_error",
                                json.dumps({"error_code": 1487930, "product_id": product.id}),
                                clean_response,
                            )

                    # Save campaign with error status so user can see and repair later
                    campaign = Campaign(
                        product_id=product.id,
                        creative_id=creative_id,
                        name=f"Campanha - {product.name}",
                        platform="meta",
                        status="error",
                        meta_campaign_id=full_result.get("campaign_id"),
                        meta_adset_id=full_result.get("adset_id"),
                        meta_creative_id=full_result.get("creative_id"),
                        meta_ad_id=full_result.get("ad_id"),
                        targeting=targeting,
                        daily_budget=daily_budget,
                        ai_strategy=targeting.get("strategy", ""),
                        meta_errors=json.dumps(full_result["errors"]),
                    )
                    db.add(campaign)
                    db.commit()
                    db.refresh(campaign)

                    # Link campaign to the most recent sale for this product
                    pending_sale = db.query(Sale).filter(
                        Sale.product_id == product.id,
                        Sale.user_id == user_id,
                        Sale.campaign_id == None
                    ).order_by(Sale.created_at.desc()).first()
                    if pending_sale:
                        pending_sale.campaign_id = campaign.id
                        pending_sale.campaign_name = campaign.name
                        pending_sale.status = "campaign_error"
                        db.commit()

                    partial_msg = ""
                    if full_result.get("campaign_id"):
                        partial_msg = f"\n\nA campanha foi criada parcialmente (ID: {full_result['campaign_id']}), mas alguns componentes falharam. Voce pode tentar reparar na aba Campanhas."

                    clean_response = f"**Houve erros ao criar a campanha completa:**\n{error_list}{partial_msg}"
                    return (
                        "campaign_created_with_errors",
                        json.dumps({"campaign_id": campaign.id, "name": campaign.name, "errors": full_result["errors"]}),
                        clean_response,
                    )

                is_mock = full_result.get("is_mock", True)

                campaign = Campaign(
                    product_id=product.id,
                    creative_id=creative_id,
                    name=f"Campanha - {product.name}",
                    platform="meta",
                    status="active" if not is_mock else "mock",
                    meta_campaign_id=full_result.get("campaign_id"),
                    meta_adset_id=full_result.get("adset_id"),
                    meta_creative_id=full_result.get("creative_id"),
                    meta_ad_id=full_result.get("ad_id"),
                    targeting=targeting,
                    daily_budget=daily_budget,
                    ai_strategy=targeting.get("strategy", ""),
                )
                db.add(campaign)
                db.commit()
                db.refresh(campaign)

                # Link campaign to the most recent sale for this product
                pending_sale = db.query(Sale).filter(
                    Sale.product_id == product.id,
                    Sale.user_id == user_id,
                    Sale.campaign_id == None
                ).order_by(Sale.created_at.desc()).first()
                if pending_sale:
                    pending_sale.campaign_id = campaign.id
                    pending_sale.campaign_name = campaign.name
                    pending_sale.status = "active" if campaign.status == "active" else campaign.status
                    db.commit()

                if not clean_response.strip():
                    if not is_mock and full_result.get("campaign_id"):
                        account_num = (settings.meta_ad_account_id or "").replace("act_", "")
                        ads_link = f"https://www.facebook.com/adsmanager/manage/campaigns?act={account_num}&selected_campaign_ids={full_result['campaign_id']}"
                        clean_response = (
                            f"**Campanha '{campaign.name}' criada com sucesso!** Seu anuncio sera veiculado no **Facebook** e **Instagram** automaticamente.\n\n"
                            f"Campanha completa com:\n"
                            f"- Campanha (ID: {full_result['campaign_id']})\n"
                            f"- Conjunto de Anuncios com targeting configurado\n"
                            f"- Anuncio com criativo (imagem + texto)\n"
                            f"- Orcamento: R${daily_budget}/dia\n"
                            f"- Plataformas: **Facebook** (Feed, Stories, Marketplace, Reels) + **Instagram** (Feed, Stories, Reels, Explore)\n"
                            f"- Status: **PAUSADA** (ative quando estiver pronto)\n\n"
                            f"[Abrir no Gerenciador de Anuncios]({ads_link})\n\n"
                            f"Voce tambem pode acompanhar na aba Campanhas."
                        )
                    else:
                        clean_response = f"**Campanha '{campaign.name}' criada com sucesso!** Seu anuncio sera veiculado no **Facebook** e **Instagram** automaticamente. Orcamento: R${daily_budget}/dia. Voce pode acompanhar na aba Campanhas."
                return (
                    "campaign_created",
                    json.dumps(
                        {"campaign_id": campaign.id, "name": campaign.name}
                    ),
                    clean_response,
                )
            return None, None, clean_response

        elif action_type == "GENERATE_STRATEGY":
            product_id = action_params.get("product_id")
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                settings = db.query(Settings).filter(Settings.user_id == user_id).first() if user_id else db.query(Settings).first()
                ai_key = app_settings.TOGETHER_API_KEY
                service = MarketResearchService(ai_api_key=ai_key)
                strategy = await service.generate_strategy(
                    product.name,
                    product.description or "",
                    product.price,
                    product.target_audience or "",
                    product.differentials or "",
                )
                return (
                    "strategy_generated",
                    json.dumps({"product_id": product_id}),
                    clean_response,
                )
            return None, None, clean_response

        elif action_type == "UPDATE_PRODUCT":
            product_id = action_params.get("product_id")
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                if "name" in action_params:
                    product.name = action_params["name"]
                if "description" in action_params:
                    product.description = action_params["description"]
                if "price" in action_params:
                    product.price = action_params["price"]
                if "target_audience" in action_params:
                    product.target_audience = action_params["target_audience"]
                if "differentials" in action_params:
                    product.differentials = action_params["differentials"]
                if "pricing_type" in action_params:
                    product.pricing_type = action_params["pricing_type"]
                if "recurrence_period" in action_params:
                    product.recurrence_period = action_params["recurrence_period"]
                if "website_url" in action_params:
                    product.website_url = action_params["website_url"]
                db.commit()
                db.refresh(product)
                if not clean_response.strip():
                    clean_response = f"Produto **{product.name}** (ID: {product.id}) atualizado com sucesso!"
                return ("product_updated", json.dumps({"product_id": product.id, "name": product.name}), clean_response)
            return None, None, clean_response

        elif action_type == "DELETE_PRODUCT":
            product_id = action_params.get("product_id")
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                product_name = product.name
                db.delete(product)
                db.commit()
                if not clean_response.strip():
                    clean_response = f"Produto **{product_name}** (ID: {product_id}) removido com sucesso!"
                return ("product_deleted", json.dumps({"product_id": product_id, "name": product_name}), clean_response)
            return None, None, clean_response

        elif action_type == "CREATE_WHATSAPP_CAMPAIGN":
            product_id = action_params.get("product_id")
            message_template = action_params.get("message_template", "")
            campaign_name = action_params.get("campaign_name", "")
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                from app.models.whatsapp import WhatsAppCampaign
                campaign = WhatsAppCampaign(
                    name=campaign_name or f"WhatsApp - {product.name}",
                    template_text=message_template or f"Ola {{nome}}! Conheca {product.name}: {product.description or ''}. Preco: R${product.price:.2f}. Saiba mais!",
                    product_id=product.id,
                    status="draft",
                )
                db.add(campaign)
                db.commit()
                db.refresh(campaign)
                if not clean_response.strip():
                    clean_response = (
                        f"**Campanha WhatsApp '{campaign.name}' criada com sucesso!**\n\n"
                        f"**Mensagem:**\n{campaign.template_text}\n\n"
                        f"**Status:** Rascunho\n\n"
                        f"Para enviar, va na aba **WhatsApp** e selecione os contatos destinatarios. "
                        f"Voce tambem pode importar contatos por CSV la."
                    )
                return (
                    "whatsapp_campaign_created",
                    json.dumps({"campaign_id": campaign.id, "name": campaign.name}),
                    clean_response,
                )
            return None, None, clean_response

        elif action_type == "CREATE_TIKTOK_CAMPAIGN":
            product_id = action_params.get("product_id")
            creative_id = action_params.get("creative_id")
            daily_budget = action_params.get("daily_budget", 50)
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                # TikTok is in demo mode - save campaign locally
                campaign = Campaign(
                    product_id=product.id,
                    creative_id=creative_id,
                    name=f"TikTok - {product.name}",
                    platform="tiktok",
                    status="demo",
                    targeting={"platform": "tiktok", "audience": product.target_audience or ""},
                    daily_budget=daily_budget,
                )
                db.add(campaign)
                db.commit()
                db.refresh(campaign)

                # Link campaign to the most recent sale for this product
                pending_sale = db.query(Sale).filter(
                    Sale.product_id == product.id,
                    Sale.user_id == user_id,
                    Sale.campaign_id == None
                ).order_by(Sale.created_at.desc()).first()
                if pending_sale:
                    pending_sale.campaign_id = campaign.id
                    pending_sale.campaign_name = campaign.name
                    pending_sale.status = campaign.status
                    db.commit()

                if not clean_response.strip():
                    clean_response = (
                        f"**Campanha TikTok '{campaign.name}' criada em modo demonstracao!**\n\n"
                        f"**Detalhes:**\n"
                        f"- Produto: {product.name}\n"
                        f"- Orcamento: R${daily_budget}/dia\n"
                        f"- Status: **Demonstracao** (aguardando integracao TikTok Business)\n\n"
                        f"Para publicar no TikTok de verdade, voce precisara configurar as credenciais TikTok Business nas Configuracoes. "
                        f"Em breve disponibilizaremos essa integracao!"
                    )
                return (
                    "tiktok_campaign_created",
                    json.dumps({"campaign_id": campaign.id, "name": campaign.name}),
                    clean_response,
                )
            return None, None, clean_response

        return None, None, clean_response
