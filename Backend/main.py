# ayushbhardwaj90/dataset-generator-using-genai/Dataset-Generator-using-GenAI-79155e47a57111fac9d81a099df114ccf1eeb342/main.py

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Union

from auth_new import auth_manager, get_current_user, get_db
from authlib.integrations.starlette_client import OAuth as OAuthClient
from exports import exporter
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from generator import DatasetGenerator
from jinja2 import Environment, FileSystemLoader
from models import GenerationHistory, User
from schemas import AugmentationResponse  # Import new augmentation schemas
from schemas import (AugmentDataRequest, ExactValueConstraint,
                     ForgotPasswordRequest, GenerationRequest,
                     GenerationResponse, HistoryEntry, HistoryResponse,
                     PercentageConstraint, RangeConstraint,
                     RelationalGenerationRequest, RelationalGenerationResponse,
                     ResetPasswordRequest, TableSchema, Token, UserCreate,
                     UserResponse)
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy.orm import Session  # <--- Make sure this line is present!
# --- NEW: OAuth imports
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI(title="Synthetic Dataset Generator with GenAI", version="2.0.0")

# --- UPDATED: CORSMiddleware Configuration ---
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://10.200.21.108:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = DatasetGenerator()

# --- NEW: SendGrid Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDGRID_SENDER_EMAIL")

# --- NEW: Jinja2 template environment setup
template_env = Environment(loader=FileSystemLoader("templates"))

# --- NEW: OAuth 2.0 Configuration for Google Sign-In
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

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "Synthetic Dataset Generator API v2.0 is running!",
        "features": ["User Authentication", "Custom Prompts", "AI Generation", "Export Functions", "Generation History", "Granular Control", "Multi-Table Relational Synthesis", "Data Augmentation & Bias Correction"],
        "status": "active"
    }

# Authentication endpoints
@app.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    if auth_manager.get_user(db, username=user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if auth_manager.get_user_by_email(db, email=user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    db_user = auth_manager.create_user(
        db=db, 
        username=user.username, 
        email=user.email, 
        password=user.password
    )
    return db_user

@app.post("/token", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_manager.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_manager.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# --- NEW: Password Reset Endpoints with SendGrid ---
def send_password_reset_email(email: str, reset_url: str):
    """Helper function to send the password reset email using SendGrid."""
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
        # In a real app, you might log this error or notify an admin

@app.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = auth_manager.get_user_by_email(db, email=request.email)
    if not user:
        # Prevent user enumeration by returning a generic success message
        return {"message": "If a matching email was found, a password reset link has been sent."}
    
    # Generate a password reset token
    token = auth_manager.create_reset_token(data={"sub": user.email})
    
    # Create reset link
    reset_url = f"http://localhost:3000/reset-password?token={token}" # Adjust this URL for your frontend
    
    # Send email in the background
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

# Generation endpoints
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
        # NEW: Handle custom domain AND pre-defined domains with a custom prompt
        if request.domain == "Custom":
            # The original logic for 'Custom' still applies
            data = generator.generate_custom_data(request.custom_prompt, request.rows, request.constraints)
            domain_name = "Custom"
        else:
            # Pass the custom prompt and constraints for pre-defined domains
            data = generator.generate_sample_data(request.domain, request.rows, request.constraints, request.custom_prompt)
            domain_name = request.domain

        # Save to history
        # Convert constraints to a JSON string for storage in custom_prompt if present
        constraints_str = json.dumps([c.dict() for c in request.constraints]) if request.constraints else None

        history_entry = GenerationHistory(
            domain=domain_name,
            rows_generated=len(data),
            data_json=json.dumps(data),
            user_id=current_user.id,
            custom_prompt=request.custom_prompt if request.custom_prompt else constraints_str # Store prompt or constraints
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}"
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

        # Save to history - store the entire relational request as custom_prompt for traceability
        history_entry = GenerationHistory(
            domain="Relational",
            rows_generated=total_records, # Total records across all tables
            data_json=json.dumps(generated_data),
            user_id=current_user.id,
            custom_prompt=request.json() # Store the full relational schema request
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
            
            # Handle both single-table and multi-table data from history
            loaded_data = json.loads(history_entry.data_json)
            if isinstance(loaded_data, dict) and all(isinstance(v, list) for v in loaded_data.values()):
                # If it's multi-table, flatten it for augmentation for now
                # Future enhancement: allow augmentation on specific tables within relational data
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
            # For relational data, preview might be the first record of the first table
            if isinstance(data, dict) and data:
                first_table_name = next(iter(data))
                preview = data[first_table_name][:1] if data[first_table_name] else []
            else: # For single table data
                preview = data[:1] if data else []
        except:
            preview = []
            
        result.append({
            "id": entry.id,
            "domain": entry.domain,
            "rows_generated": entry.rows_generated,
            "created_at": entry.created_at.isoformat(),
            "custom_prompt": entry.custom_prompt, # This now might contain constraints JSON or relational schema JSON
            "preview": preview
        })
    
    return {"history": result, "total": len(result)}

# Export endpoints
@app.get("/export/csv")
def export_csv(
    domain: str, 
    rows: int = 10, 
    custom_prompt: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        if domain == "Custom" and custom_prompt:
            data = generator.generate_custom_data(custom_prompt, rows, constraints=None)
        else:
            data = generator.generate_sample_data(domain, rows, constraints=None, custom_prompt=custom_prompt)
            
        csv_content = exporter.to_csv(data)
        filename = f"{domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/json")
def export_json(
    domain: str, 
    rows: int = 10, 
    custom_prompt: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        if domain == "Custom" and custom_prompt:
            data = generator.generate_custom_data(custom_prompt, rows, constraints=None)
        else:
            data = generator.generate_sample_data(domain, rows, constraints=None, custom_prompt=custom_prompt)
            
        json_content = exporter.to_json(data)
        filename = f"{domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/excel")
def export_excel(
    domain: str, 
    rows: int = 10, 
    custom_prompt: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        if domain == "Custom" and custom_prompt:
            data = generator.generate_custom_data(custom_prompt, rows, constraints=None)
        else:
            data = generator.generate_sample_data(domain, rows, constraints=None, custom_prompt=custom_prompt)
            
        excel_content = exporter.to_excel_bytes(data)
        filename = f"{domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return Response(
            content=excel_content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))