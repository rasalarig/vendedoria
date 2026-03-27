import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine
from app.api import api_router

import app.models  # noqa: F401

# Use persistent disk on Render if available, otherwise use local directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = "/app/data" if os.path.exists("/app/data") else BACKEND_DIR

# Use absolute path for uploads directory (consistent with products.py)
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    return """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Politica de Privacidade - VendedorIA</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #09090b; color: #e4e4e7;
                max-width: 800px; margin: 0 auto; padding: 40px 20px;
                line-height: 1.7;
            }
            h1 { color: #a78bfa; border-bottom: 1px solid #27272a; padding-bottom: 16px; }
            h2 { color: #c4b5fd; margin-top: 32px; }
            p, li { color: #a1a1aa; }
            a { color: #8b5cf6; }
            .update { color: #71717a; font-size: 14px; margin-top: 40px; border-top: 1px solid #27272a; padding-top: 16px; }
        </style>
    </head>
    <body>
        <h1>Politica de Privacidade</h1>
        <p><strong>VendedorIA</strong> — Plataforma de Marketing Digital com Inteligencia Artificial</p>
        <p>Ultima atualizacao: Marco de 2026</p>

        <h2>1. Dados Coletados</h2>
        <p>Coletamos as seguintes informacoes quando voce utiliza nossa plataforma:</p>
        <ul>
            <li>Informacoes da conta: nome, email e dados de autenticacao</li>
            <li>Dados de integracao: token de acesso do Facebook/Meta, ID da conta de anuncios, ID da pagina do Facebook</li>
            <li>Dados de produtos: informacoes dos produtos cadastrados para campanhas publicitarias</li>
            <li>Dados de campanhas: metricas, criativos e configuracoes de anuncios</li>
        </ul>

        <h2>2. Como Utilizamos seus Dados</h2>
        <p>Seus dados sao utilizados exclusivamente para:</p>
        <ul>
            <li>Criar e gerenciar campanhas publicitarias no Meta Ads (Facebook e Instagram)</li>
            <li>Gerar criativos e textos de anuncio com inteligencia artificial</li>
            <li>Monitorar metricas e desempenho de campanhas</li>
            <li>Melhorar a experiencia do usuario na plataforma</li>
        </ul>

        <h2>3. Servicos de Terceiros</h2>
        <p>Nossa plataforma integra-se com os seguintes servicos:</p>
        <ul>
            <li><strong>Meta Platforms (Facebook/Instagram)</strong>: Para criacao e gestao de campanhas publicitarias</li>
            <li><strong>Provedores de IA</strong>: Para geracao de textos e imagens de criativos</li>
        </ul>
        <p>Cada servico possui sua propria politica de privacidade e termos de uso.</p>

        <h2>4. Seguranca dos Dados</h2>
        <p>Implementamos medidas de seguranca para proteger seus dados, incluindo criptografia de tokens de acesso e armazenamento seguro de credenciais. Seus tokens do Meta sao armazenados localmente e nunca compartilhados com terceiros.</p>

        <h2>5. Seus Direitos</h2>
        <p>Voce tem o direito de:</p>
        <ul>
            <li>Acessar seus dados pessoais armazenados na plataforma</li>
            <li>Solicitar a correcao de dados incorretos</li>
            <li>Solicitar a exclusao de seus dados e conta</li>
            <li>Revogar o acesso a qualquer integracao (Meta, WhatsApp, TikTok)</li>
            <li>Exportar seus dados</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>Utilizamos cookies essenciais para o funcionamento da plataforma. Nao utilizamos cookies de rastreamento de terceiros.</p>

        <h2>7. Exclusao de Dados</h2>
        <p>Para solicitar a exclusao de seus dados, acesse as Configuracoes da plataforma e utilize a opcao de exclusao de conta, ou entre em contato conosco atraves da plataforma.</p>

        <h2>8. Alteracoes nesta Politica</h2>
        <p>Esta politica pode ser atualizada periodicamente. Alteracoes significativas serao comunicadas atraves da plataforma.</p>

        <div class="update">
            <p>VendedorIA &copy; 2026. Todos os direitos reservados.</p>
        </div>
    </body>
    </html>
    """


@app.get("/terms", response_class=HTMLResponse)
async def terms_of_service():
    return """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Termos de Servico - VendedorIA</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #09090b; color: #e4e4e7;
                max-width: 800px; margin: 0 auto; padding: 40px 20px;
                line-height: 1.7;
            }
            h1 { color: #a78bfa; border-bottom: 1px solid #27272a; padding-bottom: 16px; }
            h2 { color: #c4b5fd; margin-top: 32px; }
            p, li { color: #a1a1aa; }
            a { color: #8b5cf6; }
            .update { color: #71717a; font-size: 14px; margin-top: 40px; border-top: 1px solid #27272a; padding-top: 16px; }
        </style>
    </head>
    <body>
        <h1>Termos de Servico</h1>
        <p><strong>Vendedor IA</strong> — Plataforma de Gestao de Vendas e Marketing com Inteligencia Artificial</p>
        <p>Ultima atualizacao: Marco de 2026</p>

        <h2>1. Aceitacao dos Termos</h2>
        <p>Ao acessar ou utilizar a plataforma Vendedor IA, voce concorda com estes Termos de Servico. Caso nao concorde com qualquer disposicao aqui descrita, voce nao devera utilizar a plataforma. O uso continuado da plataforma apos quaisquer alteracoes constitui aceitacao dos termos revisados.</p>

        <h2>2. Descricao do Servico</h2>
        <p>O Vendedor IA e uma plataforma de gestao de vendas e marketing digital com inteligencia artificial que oferece:</p>
        <ul>
            <li>Gestao de leads e funil de vendas</li>
            <li>Criacao e gerenciamento de campanhas publicitarias</li>
            <li>Geracao de criativos e textos com inteligencia artificial</li>
            <li>Integracoes com Meta Ads (Facebook e Instagram), WhatsApp e TikTok</li>
            <li>Analise de metricas e desempenho de vendas</li>
            <li>Automacao de processos de marketing e vendas</li>
        </ul>

        <h2>3. Cadastro e Conta</h2>
        <p>Para utilizar a plataforma, voce devera criar uma conta fornecendo informacoes verdadeiras e completas. Voce e responsavel por:</p>
        <ul>
            <li>Manter a confidencialidade de suas credenciais de acesso</li>
            <li>Todas as atividades realizadas em sua conta</li>
            <li>Notificar imediatamente qualquer uso nao autorizado de sua conta</li>
            <li>Manter seus dados cadastrais atualizados</li>
        </ul>
        <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos ou que apresentem atividades suspeitas.</p>

        <h2>4. Uso Permitido</h2>
        <p>Voce se compromete a utilizar a plataforma apenas para fins legais e em conformidade com a legislacao brasileira vigente. E expressamente proibido:</p>
        <ul>
            <li>Utilizar a plataforma para envio de spam ou mensagens nao solicitadas</li>
            <li>Criar campanhas com conteudo enganoso, difamatorio ou ilegal</li>
            <li>Tentar acessar dados de outros usuarios sem autorizacao</li>
            <li>Realizar engenharia reversa ou interferir no funcionamento da plataforma</li>
            <li>Utilizar bots ou scripts automatizados para manipular a plataforma</li>
            <li>Violar direitos de propriedade intelectual de terceiros</li>
        </ul>

        <h2>5. Propriedade Intelectual</h2>
        <p>Todo o conteudo da plataforma Vendedor IA, incluindo mas nao limitado a software, design, logotipos, textos e algoritmos de inteligencia artificial, e de propriedade exclusiva do Vendedor IA ou de seus licenciadores.</p>
        <p>O conteudo gerado pela inteligencia artificial para suas campanhas e criativos pode ser utilizado livremente por voce para fins comerciais, porem voce e responsavel por garantir que o uso esteja em conformidade com as leis aplicaveis e os termos das plataformas de terceiros onde o conteudo sera publicado.</p>

        <h2>6. Limitacoes de Responsabilidade</h2>
        <p>O Vendedor IA e fornecido "como esta" e "conforme disponivel". Nao garantimos que:</p>
        <ul>
            <li>A plataforma estara disponivel de forma ininterrupta ou livre de erros</li>
            <li>Os resultados obtidos com o uso da plataforma serao precisos ou confiaveis</li>
            <li>O conteudo gerado por IA sera isento de imprecisoes</li>
        </ul>
        <p>Em nenhuma hipotese seremos responsaveis por danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou impossibilidade de uso da plataforma, incluindo perda de lucros, dados ou oportunidades de negocio.</p>

        <h2>7. Integracoes com Terceiros</h2>
        <p>A plataforma oferece integracoes com servicos de terceiros, incluindo:</p>
        <ul>
            <li><strong>Meta Ads (Facebook e Instagram)</strong>: Para criacao e gestao de campanhas publicitarias. O uso esta sujeito aos Termos de Servico e Politicas de Publicidade da Meta.</li>
            <li><strong>WhatsApp Business API</strong>: Para comunicacao com leads e clientes. O uso esta sujeito aos Termos de Servico do WhatsApp Business.</li>
            <li><strong>TikTok Ads</strong>: Para criacao de campanhas na plataforma TikTok. O uso esta sujeito aos Termos de Publicidade do TikTok.</li>
        </ul>
        <p>Nao nos responsabilizamos por alteracoes, indisponibilidades ou mudancas nas politicas desses servicos de terceiros. Voce e responsavel por cumprir os termos e politicas de cada plataforma integrada.</p>

        <h2>8. Pagamentos e Assinaturas</h2>
        <p>O acesso a determinadas funcionalidades da plataforma requer uma assinatura paga. Ao contratar um plano:</p>
        <ul>
            <li>Voce autoriza a cobranca recorrente conforme o plano escolhido</li>
            <li>Os precos podem ser atualizados com aviso previo de 30 dias</li>
            <li>O pagamento de campanhas publicitarias no Meta Ads, TikTok e outros servicos e de sua exclusiva responsabilidade e cobrado diretamente pelas respectivas plataformas</li>
            <li>Creditos de IA consumidos nao sao reembolsaveis</li>
        </ul>

        <h2>9. Cancelamento e Encerramento</h2>
        <p>Voce pode cancelar sua assinatura a qualquer momento atraves das Configuracoes da plataforma. Ao cancelar:</p>
        <ul>
            <li>O acesso as funcionalidades premium sera mantido ate o final do periodo ja pago</li>
            <li>Seus dados serao mantidos por 30 dias apos o cancelamento, permitindo reativacao</li>
            <li>Apos o periodo de retencao, seus dados serao permanentemente excluidos</li>
            <li>Campanhas ativas nas plataformas de terceiros deverao ser pausadas ou encerradas diretamente por voce</li>
        </ul>
        <p>Reservamo-nos o direito de encerrar sua conta imediatamente em caso de violacao destes termos.</p>

        <h2>10. Alteracoes nos Termos</h2>
        <p>Podemos atualizar estes Termos de Servico periodicamente. Alteracoes significativas serao comunicadas atraves da plataforma ou por email com pelo menos 15 dias de antecedencia. O uso continuado da plataforma apos a entrada em vigor das alteracoes constitui aceitacao dos novos termos.</p>

        <h2>11. Contato</h2>
        <p>Para duvidas, sugestoes ou solicitacoes relacionadas a estes Termos de Servico, entre em contato conosco atraves da propria plataforma Vendedor IA na secao de Configuracoes, ou envie uma mensagem pelo canal de suporte disponivel no painel.</p>

        <div class="update">
            <p>Vendedor IA &copy; 2026. Todos os direitos reservados.</p>
        </div>
    </body>
    </html>
    """


@app.get("/data-deletion", response_class=HTMLResponse)
async def data_deletion():
    return """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exclusao de Dados - VendedorIA</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #09090b; color: #e4e4e7;
                max-width: 800px; margin: 0 auto; padding: 40px 20px;
                line-height: 1.7;
            }
            h1 { color: #a78bfa; border-bottom: 1px solid #27272a; padding-bottom: 16px; }
            h2 { color: #c4b5fd; margin-top: 32px; }
            p, li { color: #a1a1aa; }
            a { color: #8b5cf6; }
            .steps { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin: 20px 0; }
            .steps li { margin: 8px 0; }
        </style>
    </head>
    <body>
        <h1>Instrucoes para Exclusao de Dados</h1>
        <p><strong>VendedorIA</strong> — Plataforma de Marketing Digital</p>

        <h2>Como solicitar a exclusao dos seus dados</h2>
        <div class="steps">
            <ol>
                <li>Acesse a plataforma VendedorIA</li>
                <li>Va em <strong>Configuracoes</strong></li>
                <li>Na secao <strong>Conta</strong>, clique em <strong>Excluir minha conta e dados</strong></li>
                <li>Confirme a exclusao</li>
            </ol>
        </div>

        <h2>O que sera excluido</h2>
        <ul>
            <li>Dados da sua conta (nome, email)</li>
            <li>Tokens de acesso e credenciais do Meta/Facebook</li>
            <li>Produtos cadastrados</li>
            <li>Criativos gerados</li>
            <li>Historico de campanhas</li>
            <li>Historico de conversas com a IA</li>
        </ul>

        <h2>Exclusao automatica via Meta</h2>
        <p>Se voce solicitou a exclusao de dados atraves do Facebook, a solicitacao e processada automaticamente pelo nosso sistema via callback do Meta. Voce recebera um codigo de confirmacao para acompanhar o status da exclusao.</p>

        <h2>Prazo</h2>
        <p>A exclusao dos dados e processada imediatamente apos a confirmacao. Alguns dados podem levar ate 30 dias para serem completamente removidos de backups.</p>

        <h2>Dados em servicos de terceiros</h2>
        <p>Campanhas ja publicadas no Meta Ads continuarao ativas ate que voce as desative diretamente no Gerenciador de Anuncios do Facebook. A exclusao de dados no VendedorIA nao afeta campanhas ja publicadas.</p>

        <p style="margin-top: 40px; color: #71717a; border-top: 1px solid #27272a; padding-top: 16px;">
            VendedorIA &copy; 2026
        </p>
    </body>
    </html>
    """


# Mount uploads directory for serving static files
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "creatives"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "faces"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "videos", "generated"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    # Migrations are handled by Alembic (python -m alembic upgrade head)
    # Only runtime initialization here
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE settings SET meta_app_mode = 'unknown' WHERE meta_app_mode = 'development'"))
            conn.commit()
    except Exception:
        pass


# Serve compiled Angular frontend (must be AFTER all API routes and mounts)
_static_dir = os.path.join(BACKEND_DIR, "static")
if os.path.exists(_static_dir):
    # Serve static assets directory if it exists
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend-assets")

    # Server-side redirect: / → /landing (avoids browser cache issues with client-side redirects)
    @app.get("/", include_in_schema=False)
    async def serve_root():
        return RedirectResponse(url="/landing", status_code=302)

    # SPA fallback: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try to serve the exact file first (JS, CSS, etc.)
        file_path = os.path.join(_static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fall back to index.html for SPA routing
        index_path = os.path.join(_static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Not found"}
