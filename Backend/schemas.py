from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ConstraintType(str, Enum):
    PERCENTAGE_DISTRIBUTION = "percentage_distribution"
    EXACT_VALUE = "exact_value"
    RANGE = "range"

class PercentageConstraint(BaseModel):
    field: str = Field(..., description="The name of the field to apply the percentage constraint to.")
    value: str = Field(..., description="The specific categorical value within the field (e.g., 'high-value').")
    percentage: float = Field(..., ge=0.0, le=100.0, description="The desired percentage for this category (0.0 to 100.0).")

class ExactValueConstraint(BaseModel):
    field: str = Field(..., description="The name of the field to enforce an exact value on.")
    value: Union[str, int, float, bool] = Field(..., description="The exact value the field should have.")

class RangeConstraint(BaseModel):
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

class ColumnDataType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"

class ColumnSchema(BaseModel):
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
    name: str = Field(..., description="The name of the table (e.g., 'customers').")
    columns: List[ColumnSchema] = Field(..., description="A list of column schemas for this table.")
    rows: int = Field(5, ge=1, description="The number of rows to generate for this table.")

    @validator('columns')
    def at_least_one_column_and_primary_key(cls, v):
        if not v:
            raise ValueError('Each table must have at least one column.')
        if not any(col.is_primary_key for col in v):
            pass
        return v

class RelationalGenerationRequest(BaseModel):
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

class GenerationRequest(BaseModel):
    domain: str = Field(..., description="The domain for which to generate data (e.g., 'E-commerce', 'Custom').")
    rows: int = Field(5, ge=1, description="The number of records to generate.")
    custom_prompt: Optional[str] = Field(None, description="A free-form prompt for 'Custom' domain generation.")
    constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = Field(
        None, description="A list of granular constraints to apply to the generated data."
    )

    @validator('custom_prompt')
    def custom_prompt_required_for_custom_domain(cls, v, values):
        if values.get('domain') == 'Custom' and not v:
            raise ValueError('custom_prompt is required for the "Custom" domain')
        return v

class AugmentationStrategy(str, Enum):
    TARGET_PERCENTAGE = "target_percentage"
    BALANCE_CATEGORIES = "balance_categories"
    OVERSAMPLE_VALUE = "oversample_value"

class AugmentationRule(BaseModel):
    field: str = Field(..., description="The name of the field to which the rule applies.")
    strategy: AugmentationStrategy = Field(..., description="The augmentation strategy to use.")
    value: Optional[Any] = Field(
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
    data: Optional[List[Dict]] = Field(
        None, description="The dataset to augment, provided directly as a list of records."
    )
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

# NEW EXPORT REQUEST SCHEMA - ADD THIS
class ExportRequest(BaseModel):
    data: Union[List[Dict], Dict[str, List[Dict]]] = Field(
        ..., 
        description="The data to export. Can be a list of dictionaries for single table data, or a dictionary of table names to data for relational data."
    )
    domain: str = Field(
        ..., 
        description="The domain/type of the data being exported (e.g., 'E-commerce', 'Custom', 'Relational')."
    )
    filename: Optional[str] = Field(
        None, 
        description="Optional custom filename for the export. If not provided, a timestamp-based filename will be generated."
    )

    @validator('data')
    def validate_data_structure(cls, v):
        if isinstance(v, list):
            if len(v) == 0:
                raise ValueError('Data list cannot be empty')
            if not all(isinstance(item, dict) for item in v):
                raise ValueError('All items in data list must be dictionaries')
        elif isinstance(v, dict):
            if len(v) == 0:
                raise ValueError('Data dictionary cannot be empty')
            for table_name, table_data in v.items():
                if not isinstance(table_data, list):
                    raise ValueError(f'Table data for "{table_name}" must be a list')
                if len(table_data) > 0 and not all(isinstance(item, dict) for item in table_data):
                    raise ValueError(f'All items in table "{table_name}" must be dictionaries')
        else:
            raise ValueError('Data must be either a list of dictionaries or a dictionary of lists')
        return v

    @validator('domain')
    def validate_domain(cls, v):
        if not v or not v.strip():
            raise ValueError('Domain cannot be empty')
        return v.strip()

class GenerationResponse(BaseModel):
    success: bool
    data: List[Dict]
    count: int
    generated_by: str
    domain: str

class HistoryEntry(BaseModel):
    id: int
    domain: str
    rows_generated: int
    created_at: datetime
    custom_prompt: Optional[str]
    preview: Optional[List[Dict]] = None

    class Config:
        orm_mode = True

class HistoryResponse(BaseModel):
    history: List[HistoryEntry]
    total: int

class RelationalGenerationResponse(BaseModel):
    success: bool
    data: Dict[str, List[Dict]] = Field(..., description="A dictionary where keys are table names and values are lists of generated records.")
    generated_by: str
    total_tables: int
    total_records: int

class AugmentationResponse(BaseModel):
    success: bool
    augmented_data: List[Dict] = Field(..., description="The augmented dataset.")
    original_count: int
    augmented_count: int
    message: str
