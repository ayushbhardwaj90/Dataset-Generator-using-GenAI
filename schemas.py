from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator

# --- Existing Schemas (unchanged) ---

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- New Schemas for Password Reset ---

class ForgotPasswordRequest(BaseModel):
    """Schema for a forgot password request."""
    email: str

class ResetPasswordRequest(BaseModel):
    """Schema for resetting a password with a token."""
    token: str
    new_password: str

# --- Schemas for Granular Control (from previous step) ---

class ConstraintType(str, Enum):
    """Defines the type of granular constraint."""
    PERCENTAGE_DISTRIBUTION = "percentage_distribution"
    EXACT_VALUE = "exact_value"
    RANGE = "range"
    # Add more constraint types here as needed

class PercentageConstraint(BaseModel):
    """Schema for specifying a percentage distribution for a categorical field."""
    field: str = Field(..., description="The name of the field to apply the percentage constraint to.")
    value: str = Field(..., description="The specific categorical value within the field (e.g., 'high-value').")
    percentage: float = Field(..., ge=0.0, le=100.0, description="The desired percentage for this category (0.0 to 100.0).")

class ExactValueConstraint(BaseModel):
    """Schema for enforcing an exact value on a field."""
    field: str = Field(..., description="The name of the field to enforce an exact value on.")
    value: Union[str, int, float, bool] = Field(..., description="The exact value the field should have.")

class RangeConstraint(BaseModel):
    """Schema for specifying a numerical range for a field."""
    field: str = Field(..., description="The name of the numerical field to apply the range constraint to.")
    min_value: Optional[Union[int, float]] = Field(None, description="The minimum allowed value for the field.")
    max_value: Optional[Union[int, float]] = Field(None, description="The maximum allowed value for the field.")

    @validator('max_value')
    def check_min_max_values(cls, v, values):
        if 'min_value' in values and v is not None and values['min_value'] is not None and v < values['min_value']:
            raise ValueError('max_value must be greater than or equal to min_value')
        if v is None and values.get('min_value') is None:
            raise ValueError('At least one of min_value or max_value must be provided for a range constraint')
        return v

# --- Schemas for Multi-Table Relational Synthesis (from previous step) ---

class ColumnDataType(str, Enum):
    """Standardized data types for columns in a relational schema."""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date" # YYYY-MM-DD
    DATETIME = "datetime" # YYYY-MM-DD HH:MM:SS

class ColumnSchema(BaseModel):
    """Defines the properties of a single column within a table."""
    name: str = Field(..., description="The name of the column (e.g., 'customer_id').")
    data_type: ColumnDataType = Field(..., description="The data type of the column.")
    description: Optional[str] = Field(None, description="A brief description of the column's content or purpose.")
    is_primary_key: bool = Field(False, description="True if this column is the primary key for its table.")
    is_foreign_key: bool = Field(False, description="True if this column is a foreign key referencing another table.")
    references_table: Optional[str] = Field(None, description="If a foreign key, the name of the table it references.")
    references_column: Optional[str] = Field(None, description="If a foreign key, the name of the column it references in the referenced table.")
    unique: bool = Field(False, description="True if values in this column must be unique.")

    @validator('references_table', 'references_column')
    def foreign_key_details_required_if_foreign_key(cls, v, values):
        if values.get('is_foreign_key') and not v:
            raise ValueError('references_table and references_column are required if is_foreign_key is True')
        return v

class TableSchema(BaseModel):
    """Defines an individual table, including its name, columns, and number of rows."""
    name: str = Field(..., description="The name of the table (e.g., 'customers').")
    columns: List[ColumnSchema] = Field(..., description="A list of column schemas for this table.")
    rows: int = Field(5, ge=1, description="The number of rows to generate for this table.")

    @validator('columns')
    def at_least_one_column_and_primary_key(cls, v):
        if not v:
            raise ValueError('Each table must have at least one column.')
        if not any(col.is_primary_key for col in v):
            # It's good practice for tables to have a primary key, but we can make this optional for flexibility
            # raise ValueError('Each table should have at least one primary key column.')
            pass # Allowing tables without explicit primary keys for now, but good to note.
        return v

class RelationalGenerationRequest(BaseModel):
    """Main request schema for multi-table relational data generation."""
    tables: List[TableSchema] = Field(..., description="A list of table schemas, defining all tables and their structures.")
    global_constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = Field(
        None, description="Optional granular constraints that apply across all tables or specific fields within tables."
    )

    @validator('tables')
    def unique_table_names(cls, v):
        table_names = [table.name for table in v]
        if len(table_names) != len(set(table_names)):
            raise ValueError('All table names must be unique.')
        return v

# --- Updated GenerationRequest (for single table generation) ---
class GenerationRequest(BaseModel):
    """Updated schema for single-table data generation requests, including granular constraints."""
    domain: str = Field(..., description="The domain for which to generate data (e.g., 'E-commerce', 'Custom').")
    rows: int = Field(5, ge=1, description="The number of records to generate.")
    custom_prompt: Optional[str] = Field(None, description="A free-form prompt for 'Custom' domain generation.")
    
    # New field to include granular constraints
    constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = Field(
        None, description="A list of granular constraints to apply to the generated data."
    )

    @validator('custom_prompt')
    def custom_prompt_required_for_custom_domain(cls, v, values):
        if values.get('domain') == 'Custom' and not v:
            raise ValueError('custom_prompt is required for the "Custom" domain')
        return v

# --- New Schemas for Data Augmentation and Bias Correction ---

class AugmentationStrategy(str, Enum):
    """Defines the type of augmentation or rebalancing strategy."""
    TARGET_PERCENTAGE = "target_percentage"
    BALANCE_CATEGORIES = "balance_categories"
    OVERSAMPLE_VALUE = "oversample_value"
    # Add more strategies as needed

class AugmentationRule(BaseModel):
    """Schema for defining a single rule for data augmentation or bias correction."""
    field: str = Field(..., description="The name of the field to which the rule applies.")
    strategy: AugmentationStrategy = Field(..., description="The augmentation strategy to use.")
    value: Optional[Union[str, int, float, bool]] = Field(
        None, description="The specific value within the field to target (relevant for TARGET_PERCENTAGE, OVERSAMPLE_VALUE)."
    )
    target_percentage: Optional[float] = Field(
        None, ge=0.0, le=100.0, description="The desired percentage for the specified value (for TARGET_PERCENTAGE)."
    )
    target_count: Optional[int] = Field(
        None, ge=0, description="The desired exact count for the specified value (for OVERSAMPLE_VALUE)."
    )

    @validator('target_percentage')
    def target_percentage_required_for_percentage_strategy(cls, v, values):
        if values.get('strategy') == AugmentationStrategy.TARGET_PERCENTAGE and v is None:
            raise ValueError('target_percentage is required for TARGET_PERCENTAGE strategy')
        return v
    
    @validator('target_count')
    def target_count_required_for_oversample_strategy(cls, v, values):
        if values.get('strategy') == AugmentationStrategy.OVERSAMPLE_VALUE and v is None:
            raise ValueError('target_count is required for OVERSAMPLE_VALUE strategy')
        return v

    @validator('value')
    def value_required_for_specific_strategies(cls, v, values):
        if values.get('strategy') in [AugmentationStrategy.TARGET_PERCENTAGE, AugmentationStrategy.OVERSAMPLE_VALUE] and v is None:
            raise ValueError('value is required for TARGET_PERCENTAGE and OVERSAMPLE_VALUE strategies')
        return v


class AugmentDataRequest(BaseModel):
    """Request schema for augmenting an existing dataset."""
    # Option 1: Provide data directly
    data: Optional[List[Dict]] = Field(
        None, description="The dataset to augment, provided directly as a list of records."
    )
    # Option 2: Reference data from history
    history_id: Optional[int] = Field(
        None, description="The ID of a previously generated dataset from user history to augment."
    )
    
    rules: List[AugmentationRule] = Field(..., description="A list of augmentation and bias correction rules to apply.")

    @validator('data')
    def either_data_or_history_id_must_be_provided(cls, v, values):
        if v is None and values.get('history_id') is None:
            raise ValueError('Either "data" or "history_id" must be provided.')
        if v is not None and values.get('history_id') is not None:
            raise ValueError('Cannot provide both "data" and "history_id". Choose one.')
        return v

# --- Existing Response Schemas (unchanged) ---

class GenerationResponse(BaseModel):
    success: bool
    data: List[Dict] # This will need to change for multi-table responses
    count: int
    generated_by: str
    domain: str

class HistoryEntry(BaseModel):
    id: int
    domain: str
    rows_generated: int
    created_at: datetime
    custom_prompt: Optional[str]
    preview: List[Dict]

class HistoryResponse(BaseModel):
    history: List[HistoryEntry]
    total: int

# --- New Response Schema for Relational Generation (from previous step) ---
class RelationalGenerationResponse(BaseModel):
    """Response schema for multi-table relational data generation."""
    success: bool
    data: Dict[str, List[Dict]] = Field(..., description="A dictionary where keys are table names and values are lists of generated records.")
    generated_by: str
    total_tables: int
    total_records: int

# --- New Response Schema for Augmentation ---
class AugmentationResponse(BaseModel):
    """Response schema for data augmentation."""
    success: bool
    augmented_data: List[Dict] = Field(..., description="The augmented dataset.")
    original_count: int
    augmented_count: int
    message: str