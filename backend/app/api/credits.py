import stripe
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.config import settings
from app.models.user import User
from app.models.credit_transaction import CreditTransaction
from app.models.cost_log import CostLog
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


class HistoryEntry(BaseModel):
    id: int
    type: str  # "purchase" or "consumption"
    description: str
    amount_usd: float
    amount_brl: float
    created_at: str
    balance_after_brl: Optional[float] = None


class HistoryResponse(BaseModel):
    balance_usd: float
    balance_brl: float
    entries: List[HistoryEntry]


@router.get("/history", response_model=HistoryResponse)
def get_credit_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return unified credit history: purchases (credit_transactions) + consumptions (cost_logs)."""
    # Get purchases
    purchases = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == user_id
    ).all()

    # Get consumptions
    consumptions = db.query(CostLog).filter(
        CostLog.user_id == user_id
    ).all()

    entries = []

    for p in purchases:
        entries.append({
            "id": p.id,
            "type": "purchase",
            "description": p.description or "Compra de creditos",
            "amount_usd": p.amount_usd,
            "amount_brl": round(p.amount_usd * USD_TO_BRL, 2),
            "created_at": str(p.created_at) if p.created_at else "",
        })

    for c in consumptions:
        entries.append({
            "id": c.id + 100000,  # offset to avoid ID collision
            "type": "consumption",
            "description": c.description or f"{c.type} via {c.provider}",
            "amount_usd": c.amount_usd,
            "amount_brl": round(c.amount_usd * USD_TO_BRL, 2),
            "created_at": str(c.created_at) if c.created_at else "",
        })

    # Sort by created_at descending (newest first)
    entries.sort(key=lambda x: x["created_at"], reverse=True)

    # Calculate running balance (from oldest to newest, then reverse)
    user = db.query(User).filter(User.id == user_id).first()
    current_balance = user.credit_balance_usd if user else 0
    current_balance_brl = round(current_balance * USD_TO_BRL, 2)

    # Walk through entries newest-first, compute balance_after
    running = current_balance_brl
    for entry in entries:
        entry["balance_after_brl"] = round(running, 2)
        if entry["type"] == "purchase":
            running -= entry["amount_brl"]  # going backwards, subtract purchases
        else:
            running += entry["amount_brl"]  # going backwards, add consumptions back

    return {
        "balance_usd": round(current_balance, 2),
        "balance_brl": current_balance_brl,
        "entries": entries,
    }


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


@router.get("/verify-session")
def verify_session(
    session_id: str = Query(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Poll Stripe checkout session status (fallback when webhook secret is not configured)."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe nao configurado")

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        return {"status": "error", "detail": f"Erro ao consultar sessao: {str(e)}"}

    # Validate that the session belongs to the authenticated user
    session_user_id = session.get("metadata", {}).get("user_id")
    if session_user_id is None or int(session_user_id) != user_id:
        return {"status": "error", "detail": "Sessao nao pertence a este usuario"}

    if session.get("payment_status") != "paid":
        return {"status": "pending"}

    # Payment is confirmed - check idempotency
    existing = db.query(CreditTransaction).filter(
        CreditTransaction.stripe_session_id == session_id
    ).first()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "detail": "Usuario nao encontrado"}

    balance = user.credit_balance_usd or 0.0

    if existing:
        return {
            "status": "already_credited",
            "balance_usd": round(balance, 2),
            "balance_brl": round(balance * USD_TO_BRL, 2),
        }

    # Credit the user
    amount_usd = float(session["metadata"]["amount_usd"])
    user.credit_balance_usd = balance + amount_usd

    tx = CreditTransaction(
        user_id=user_id,
        amount_usd=amount_usd,
        type="purchase",
        description=f"Compra de {amount_usd} USD via Stripe",
        stripe_session_id=session_id,
        stripe_payment_intent=session.get("payment_intent"),
    )
    db.add(tx)
    db.commit()
    db.refresh(user)

    new_balance = user.credit_balance_usd or 0.0
    return {
        "status": "credited",
        "amount_usd": amount_usd,
        "balance_usd": round(new_balance, 2),
        "balance_brl": round(new_balance * USD_TO_BRL, 2),
    }


@router.get("/packages")
def get_packages():
    """Return available credit packages."""
    return [
        {"amount_usd": k, "amount_brl": round(k * USD_TO_BRL, 2), "label": v["label"]}
        for k, v in CREDIT_PACKAGES.items()
    ]


BONUS_AMOUNT_USD = 0.55  # Enough for 1 script + 1 video


@router.post("/reset")
def reset_credits(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Reset wallet: clear all history and restore welcome bonus. For testing only."""
    from app.models.cost_log import CostLog

    # Clear all cost logs and credit transactions for user
    db.query(CostLog).filter(CostLog.user_id == user_id).delete()
    db.query(CreditTransaction).filter(CreditTransaction.user_id == user_id).delete()

    # Reset balance to bonus
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.credit_balance_usd = BONUS_AMOUNT_USD

    # Create bonus transaction
    bonus = CreditTransaction(
        user_id=user_id,
        amount_usd=BONUS_AMOUNT_USD,
        type="bonus",
        description="Bonus de boas-vindas - teste gratis (1 roteiro + 1 video)",
    )
    db.add(bonus)
    db.commit()

    return {
        "status": "ok",
        "balance_usd": BONUS_AMOUNT_USD,
        "balance_brl": round(BONUS_AMOUNT_USD * USD_TO_BRL, 2),
    }
