import csv
import io
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import google.api_core.exceptions as api_exceptions
import pandas as pd
from auth_new import auth_manager, get_current_user, get_db
from authlib.integrations.starlette_client import OAuth as OAuthClient
from exports import exporter
from fastapi import (BackgroundTasks, Depends, FastAPI, HTTPException, Request,
                     status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from generator import DatasetGenerator
from jinja2 import Environment, FileSystemLoader
from models import GenerationHistory, User
from pydantic import BaseModel
from schemas import (AugmentationResponse, AugmentDataRequest,
                     ExactValueConstraint, ForgotPasswordRequest,
                     GenerationRequest, GenerationResponse, HistoryEntry,
                     HistoryResponse, PercentageConstraint, RangeConstraint,
                     RelationalGenerationRequest, RelationalGenerationResponse,
                     ResetPasswordRequest, TableSchema, Token, UserCreate,
                     UserResponse)
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy.orm import Session
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI(title="Synthetic Dataset Generator with GenAI", version="2.0.0")

# CORS configuration - FIXED
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "https://data-genie-jade.vercel.app",
    # Add your exact Vercel preview URLs if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Explicit OPTIONS handlers
@app.options("/register")
async def options_register():
    return {"message": "OK"}

@app.options("/token") 
async def options_token():
    return {"message": "OK"}

@app.options("/generate")
async def options_generate():
    return {"message": "OK"}

generator = DatasetGenerator()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDGRID_SENDER_EMAIL")

template_env = Environment(loader=FileSystemLoader("templates"))

config = Config('.env')
oauth = OAuthClient(config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY"))

@app.get("/")
def read_root():
    return {
        "message": "Synthetic Dataset Generator API v2.0 is running!",
        "features": ["User Authentication", "Custom Prompts", "AI Generation", "Export Functions", "Generation History", "Granular Control", "Multi-Table Relational Synthesis", "Data Augmentation & Bias Correction"],
        "status": "active"
    }

@app.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    print(f"🔍 Registration attempt for user: {user.username}")  # Debug log
    print(f"🔍 Password length: {len(user.password)} characters")  # Debug log
    
    print(f"🔍 Registration attempt for user: {user.username}")  # Debug log
    print(f"🔍 Password length: {len(user.password)} characters")  # Debug log
    
    if auth_manager.get_user(db, username=user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if auth_manager.get_user_by_email(db, email=user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        db_user = auth_manager.create_user(
            db=db, 
            username=user.username, 
            email=user.email, 
            password=user.password
        )
        print(f"✅ User {user.username} created successfully")  # Debug log
        return db_user
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
    try:
        db_user = auth_manager.create_user(
            db=db, 
            username=user.username, 
            email=user.email, 
            password=user.password
        )
        print(f"✅ User {user.username} created successfully")  # Debug log
        return db_user
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/token", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"🔍 Login attempt for user: {form_data.username}")  # Debug log
    
    try:
        user = auth_manager.authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = auth_manager.create_access_token(data={"sub": user.username})
        print(f"✅ User {form_data.username} logged in successfully")  # Debug log
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Login error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
    print(f"🔍 Login attempt for user: {form_data.username}")  # Debug log
    
    try:
        user = auth_manager.authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = auth_manager.create_access_token(data={"sub": user.username})
        print(f"✅ User {form_data.username} logged in successfully")  # Debug log
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Login error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

def send_password_reset_email(email: str, reset_url: str):
    try:
        template = template_env.get_template("password_reset.html")
        html_content = template.render(reset_url=reset_url, current_year=datetime.now().year)

        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=email,
            subject='Password Reset Request',
            html_content=html_content
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"SendGrid response status code: {response.status_code}")
        print(f"SendGrid response body: {response.body}")
        print(f"SendGrid response headers: {response.headers}")
    except Exception as e:
        print(f"Failed to send email via SendGrid: {e}")

@app.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = auth_manager.get_user_by_email(db, email=request.email)
    if not user:
        return {"message": "If a matching email was found, a password reset link has been sent."}
    
    token = auth_manager.create_reset_token(data={"sub": user.email})
    reset_url = f"https://data-genie-jade.vercel.app/reset-password?token={token}"  # Updated to use your Vercel URL
    reset_url = f"https://data-genie-jade.vercel.app/reset-password?token={token}"  # Updated to use your Vercel URL
    background_tasks.add_task(send_password_reset_email, user.email, reset_url)
    return {"message": "If a matching email was found, a password reset link has been sent."}

@app.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = auth_manager.verify_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    user = auth_manager.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    auth_manager.update_password(db, user, request.new_password)
    return {"message": "Password updated successfully."}

@app.get("/domains")
def get_domains():
    return {
        "domains": ["E-commerce", "Healthcare", "Finance", "Marketing", "HR", "Custom"]
    }

@app.post("/generate", response_model=GenerationResponse)
def generate_dataset(
    request: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # The Prompt Refinement Layer
        refined_prompt = None
        if request.custom_prompt:
            # We now catch the quota error here and handle it gracefully
            try:
                refined_prompt = generator.refine_prompt(request.custom_prompt)
            except api_exceptions.ResourceExhausted as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Generation failed due to API quota limits. Please try again after 24 hours."
                )
        
        # Fallback if prompt is too vague or could not be refined
        if refined_prompt is None and request.domain == 'Custom':
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your custom prompt was too vague or could not be refined. Please provide more detail."
            )
            
        if request.domain == "Custom":
            data = generator.generate_custom_data(refined_prompt, request.rows, request.constraints)
            domain_name = "Custom"
        else:
            data = generator.generate_sample_data(request.domain, request.rows, request.constraints, refined_prompt)
            domain_name = request.domain

        # Save to history
        constraints_str = json.dumps([c.dict() for c in request.constraints]) if request.constraints else None
        history_entry = GenerationHistory(
            domain=domain_name,
            rows_generated=len(data),
            data_json=json.dumps(data),
            user_id=current_user.id,
            custom_prompt=refined_prompt if refined_prompt else constraints_str
        )
        db.add(history_entry)
        db.commit()
        
        return GenerationResponse(
            success=True,
            data=data,
            count=len(data),
            generated_by=current_user.username,
            domain=domain_name
        )
    except Exception as e:
        # A more generic error catch for other issues
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}"
        )

# NEW ENDPOINT: This endpoint bypasses the AI generation completely
@app.post("/generate/fallback", response_model=GenerationResponse)
def generate_fallback_dataset(
    request: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve the fallback data directly based on the domain
    fallback_data = generator._get_fallback_data(request.domain, request.rows)
    
    # Save the fallback generation to history
    history_entry = GenerationHistory(
        domain=request.domain + " (Fallback)",
        rows_generated=len(fallback_data),
        data_json=json.dumps(fallback_data),
        user_id=current_user.id,
        custom_prompt="Fallback generation due to API unavailability."
    )
    db.add(history_entry)
    db.commit()
    
    return GenerationResponse(
        success=True,
        data=fallback_data,
        count=len(fallback_data),
        generated_by=current_user.username,
        domain=request.domain + " (Fallback)"
    )

@app.post("/generate/relational", response_model=RelationalGenerationResponse)
def generate_relational_dataset(
    request: RelationalGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        generated_data = generator.generate_relational_data(request)
        total_records = sum(len(table_data) for table_data in generated_data.values())
        history_entry = GenerationHistory(
            domain="Relational",
            rows_generated=total_records,
            data_json=json.dumps(generated_data),
            user_id=current_user.id,
            custom_prompt=request.json()
        )
        db.add(history_entry)
        db.commit()
        return RelationalGenerationResponse(
            success=True,
            data=generated_data,
            generated_by=current_user.username,
            total_tables=len(generated_data),
            total_records=total_records
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Relational generation failed: {str(e)}"
        )

@app.post("/augment", response_model=AugmentationResponse)
def augment_dataset(
    request: AugmentDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        original_data_list: List[Dict]
        if request.data:
            original_data_list = request.data
        elif request.history_id:
            history_entry = db.query(GenerationHistory).filter(
                GenerationHistory.id == request.history_id,
                GenerationHistory.user_id == current_user.id
            ).first()
            if not history_entry:
                raise HTTPException(status_code=404, detail="History entry not found or not owned by user.")
            
            loaded_data = json.loads(history_entry.data_json)
            if isinstance(loaded_data, dict) and all(isinstance(v, list) for v in loaded_data.values()):
                original_data_list = [record for table_data in loaded_data.values() for record in table_data]
            else:
                original_data_list = loaded_data
        else:
            raise HTTPException(status_code=400, detail="Either 'data' or 'history_id' must be provided.")
        
        original_count = len(original_data_list)
        augmented_data = generator.augment_data(original_data_list, request.rules)
        augmented_count = len(augmented_data)
        return AugmentationResponse(
            success=True,
            augmented_data=augmented_data,
            original_count=original_count,
            augmented_count=augmented_count,
            message=f"Dataset augmented from {original_count} to {augmented_count} records."
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data augmentation failed: {str(e)}"
        )

@app.get("/history")
def get_generation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(GenerationHistory)\
                .filter(GenerationHistory.user_id == current_user.id)\
                .order_by(GenerationHistory.created_at.desc())\
                .limit(20).all()
    
    result = []
    for entry in history:
        try:
            data = json.loads(entry.data_json)
            if isinstance(data, dict) and data:
                first_table_name = next(iter(data))
                preview = data[first_table_name][:1] if data[first_table_name] else []
            else:
                preview = data[:1] if data else []
        except:
            preview = []
            
        result.append({
            "id": entry.id,
            "domain": entry.domain,
            "rows_generated": entry.rows_generated,
            "created_at": entry.created_at.isoformat(),
            "custom_prompt": entry.custom_prompt,
            "preview": preview,
            "data_json": entry.data_json  # Include full data
        })
    
    return {"history": result, "total": len(result)}

class ExportRequest(BaseModel):
    data: Union[List[Dict], Dict[str, List[Dict]]]  # Support both single and relational data
    domain: str

@app.post("/export/csv")
def export_csv_post(
    request: ExportRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"🔍 CSV Export: Received data for domain '{request.domain}'")
        
        # Handle relational data (convert to single list)
        if isinstance(request.data, dict):
            # Flatten relational data
            all_data = []
            for table_name, table_data in request.data.items():
                for record in table_data:
                    record['_table'] = table_name  # Add table identifier
                    all_data.append(record)
            data_to_export = all_data
        else:
            data_to_export = request.data
            
        print(f"🔍 CSV Export: Processing {len(data_to_export)} records")
        
        csv_content = exporter.to_csv(data_to_export)
        filename = f"{request.domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"🔍 CSV Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")

@app.post("/export/excel")
def export_excel_post(
    request: ExportRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"🔍 Excel Export: Received data for domain '{request.domain}'")
        
        # Handle relational data
        if isinstance(request.data, dict):
            # For relational data, create multiple sheets
            excel_content = exporter.to_excel_bytes_relational(request.data)
        else:
            # Single table data
            excel_content = exporter.to_excel_bytes(request.data)
            
        print(f"🔍 Excel Export: Generated {len(excel_content)} bytes")
        
        filename = f"{request.domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return Response(
            content=excel_content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"🔍 Excel Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Excel export failed: {str(e)}")

@app.post("/export/json")
def export_json_post(
    request: ExportRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"🔍 JSON Export: Received data for domain '{request.domain}'")
        
        json_content = exporter.to_json(request.data)
        filename = f"{request.domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

