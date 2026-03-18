from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.models.product import Product
from app.models.strategy import MarketStrategy
from app.models.settings import Settings
from app.services.market_research import MarketResearchService

router = APIRouter(prefix="/strategy", tags=["strategy"])


class StrategyResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    market_analysis: Optional[str] = None
    target_audience_analysis: Optional[str] = None
    best_times: Optional[Dict[str, Any]] = None
    recommended_channels: Optional[List[str]] = None
    tone_of_voice: Optional[str] = None
    selling_arguments: Optional[List[str]] = None
    common_objections: Optional[List[Dict[str, str]]] = None
    budget_suggestion: Optional[str] = None
    competitor_insights: Optional[str] = None
    web_research_data: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def strategy_to_response(strategy: MarketStrategy, product_name: str = "") -> dict:
    return {
        "id": strategy.id,
        "product_id": strategy.product_id,
        "product_name": product_name,
        "market_analysis": strategy.market_analysis,
        "target_audience_analysis": strategy.target_audience_analysis,
        "best_times": strategy.best_times,
        "recommended_channels": strategy.recommended_channels,
        "tone_of_voice": strategy.tone_of_voice,
        "selling_arguments": strategy.selling_arguments,
        "common_objections": strategy.common_objections,
        "budget_suggestion": strategy.budget_suggestion,
        "competitor_insights": strategy.competitor_insights,
        "web_research_data": strategy.web_research_data,
        "created_at": str(strategy.created_at) if strategy.created_at else None,
    }


@router.post("/generate/{product_id}", response_model=StrategyResponse)
async def generate_strategy(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Get AI settings
    settings = db.query(Settings).filter(Settings.id == 1).first()
    ai_api_key = settings.ai_api_key if settings else ""
    ai_provider = settings.ai_provider if settings else "claude"

    # Generate strategy
    service = MarketResearchService(ai_api_key=ai_api_key, ai_provider=ai_provider)
    result = await service.generate_strategy(
        product_name=product.name,
        description=product.description or "",
        price=product.price,
        target_audience=product.target_audience or "",
        differentials=product.differentials or "",
    )

    # Save to DB
    strategy = MarketStrategy(
        product_id=product_id,
        market_analysis=result.get("market_analysis"),
        target_audience_analysis=result.get("target_audience_analysis"),
        best_times=result.get("best_times"),
        recommended_channels=result.get("recommended_channels"),
        tone_of_voice=result.get("tone_of_voice"),
        selling_arguments=result.get("selling_arguments"),
        common_objections=result.get("common_objections"),
        budget_suggestion=result.get("budget_suggestion"),
        competitor_insights=result.get("competitor_insights"),
        web_research_data=result.get("web_research_data"),
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)

    return strategy_to_response(strategy, product.name)


@router.get("", response_model=List[StrategyResponse])
async def list_strategies(db: Session = Depends(get_db)):
    strategies = db.query(MarketStrategy).order_by(MarketStrategy.created_at.desc()).all()
    result = []
    for s in strategies:
        product = db.query(Product).filter(Product.id == s.product_id).first()
        product_name = product.name if product else "Produto removido"
        result.append(strategy_to_response(s, product_name))
    return result


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(MarketStrategy).filter(MarketStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Estrategia nao encontrada")
    product = db.query(Product).filter(Product.id == strategy.product_id).first()
    product_name = product.name if product else "Produto removido"
    return strategy_to_response(strategy, product_name)


@router.get("/product/{product_id}", response_model=StrategyResponse)
async def get_strategy_by_product(product_id: int, db: Session = Depends(get_db)):
    strategy = db.query(MarketStrategy).filter(
        MarketStrategy.product_id == product_id
    ).order_by(MarketStrategy.created_at.desc()).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Nenhuma estrategia encontrada para este produto")
    product = db.query(Product).filter(Product.id == strategy.product_id).first()
    product_name = product.name if product else "Produto removido"
    return strategy_to_response(strategy, product_name)


@router.delete("/{strategy_id}")
async def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(MarketStrategy).filter(MarketStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Estrategia nao encontrada")
    db.delete(strategy)
    db.commit()
    return {"detail": "Estrategia removida com sucesso"}
