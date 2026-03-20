import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
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
