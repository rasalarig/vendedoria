import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.config import settings
from app.models.user import User
from app.models.credit_transaction import CreditTransaction
from app.services.cost_service import CostService

router = APIRouter(prefix="/credits", tags=["credits"])

USD_TO_BRL = 5.5


class BalanceResponse(BaseModel):
    balance_usd: float
    balance_brl: float
    total_spent_usd: float
    total_spent_brl: float


class CheckoutRequest(BaseModel):
    amount_usd: float  # 5, 20, or 50


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class EstimateResponse(BaseModel):
    action: str
    estimated_cost_usd: float
    estimated_cost_brl: float
    balance_usd: float
    balance_brl: float
    sufficient: bool
    breakdown: str


# Cost table for LLM-based actions (USD)
ACTION_COSTS = {
    "script": 0.01,
    "refine": 0.01,
    "chat": 0.005,
}


@router.get("/estimate", response_model=EstimateResponse)
def estimate_action_cost(
    action: str = Query(...),  # "script", "video", "refine", "chat"
    duration: float = Query(default=10),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Estimate cost of an action and check if user has sufficient balance."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    balance = user.credit_balance_usd or 0.0

    if action in ACTION_COSTS:
        estimated_usd = ACTION_COSTS[action]
        breakdown = f"{action}: ${estimated_usd} (Together AI LLM)"
    elif action == "video":
        estimate = CostService.estimate_cost("veo3", "video", duration)
        estimated_usd = estimate["estimated_usd"]
        breakdown = estimate.get("breakdown", f"video: ${estimated_usd}")
    else:
        raise HTTPException(status_code=400, detail=f"Acao desconhecida: {action}")

    estimated_brl = round(estimated_usd * USD_TO_BRL, 2)

    return EstimateResponse(
        action=action,
        estimated_cost_usd=round(estimated_usd, 4),
        estimated_cost_brl=estimated_brl,
        balance_usd=round(balance, 2),
        balance_brl=round(balance * USD_TO_BRL, 2),
        sufficient=balance >= estimated_usd,
        breakdown=breakdown,
    )


CREDIT_PACKAGES = {
    5: {"label": "R$ 27,50", "description": "5 USD em creditos VendedorIA"},
    20: {"label": "R$ 110,00", "description": "20 USD em creditos VendedorIA"},
    50: {"label": "R$ 275,00", "description": "50 USD em creditos VendedorIA"},
}


@router.get("/balance", response_model=BalanceResponse)
def get_balance(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    balance = user.credit_balance_usd or 0.0
    total_spent = CostService.get_user_total(db, user_id)

    return BalanceResponse(
        balance_usd=round(balance, 2),
        balance_brl=round(balance * USD_TO_BRL, 2),
        total_spent_usd=round(total_spent, 2),
        total_spent_brl=round(total_spent * USD_TO_BRL, 2),
    )


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    req: CheckoutRequest,
    raw_request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe nao configurado. Contate o administrador.")

    amount = int(req.amount_usd)
    if amount not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail=f"Pacote invalido. Escolha entre: {list(CREDIT_PACKAGES.keys())} USD")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    pkg = CREDIT_PACKAGES[amount]

    origin = raw_request.headers.get("origin", "http://localhost:4200")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"VendedorIA - {amount} USD em creditos",
                        "description": pkg["description"],
                    },
                    "unit_amount": amount * 100,  # Stripe uses cents
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{origin}/settings?credits=success",
            cancel_url=f"{origin}/settings?credits=cancel",
            metadata={"user_id": str(user_id), "amount_usd": str(amount)},
        )
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar sessao de pagamento: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"]["user_id"])
        amount_usd = float(session["metadata"]["amount_usd"])

        # Check if already processed
        existing = db.query(CreditTransaction).filter(
            CreditTransaction.stripe_session_id == session["id"]
        ).first()
        if existing:
            return {"status": "already_processed"}

        # Credit the user
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.credit_balance_usd = (user.credit_balance_usd or 0) + amount_usd
            tx = CreditTransaction(
                user_id=user_id,
                amount_usd=amount_usd,
                type="purchase",
                description=f"Compra de {amount_usd} USD via Stripe",
                stripe_session_id=session["id"],
                stripe_payment_intent=session.get("payment_intent"),
            )
            db.add(tx)
            db.commit()

    return {"status": "ok"}


@router.get("/packages")
def get_packages():
    """Return available credit packages."""
    return [
        {"amount_usd": k, "amount_brl": round(k * USD_TO_BRL, 2), "label": v["label"]}
        for k, v in CREDIT_PACKAGES.items()
    ]
