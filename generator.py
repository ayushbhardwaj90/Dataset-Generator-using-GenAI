import json
import os
import random
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import google.generativeai as genai
from dotenv import load_dotenv
# Import the constraint and relational schemas
from schemas import (AugmentationRule, AugmentationStrategy, ColumnDataType,
                     ColumnSchema, ExactValueConstraint, PercentageConstraint,
                     RangeConstraint, RelationalGenerationRequest, TableSchema)

# Load environment variables
load_dotenv()

class DatasetGenerator:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            print("✅ Gemini API initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Gemini API: {e}")
            raise
    
    def generate_sample_data(self, domain: str, rows: int = 5,
                             constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = None) -> List[Dict]:
        """Generate realistic sample data using AI for a specific domain with optional constraints"""
        
        try:
            if domain == "E-commerce":
                generated_data = self._generate_ecommerce_ai(rows, constraints)
            elif domain == "Healthcare":
                generated_data = self._generate_healthcare_ai(rows, constraints)
            elif domain == "Finance":
                generated_data = self._generate_finance_ai(rows, constraints)
            elif domain == "Marketing":
                generated_data = self._generate_marketing_ai(rows, constraints)
            elif domain == "HR":
                generated_data = self._generate_hr_ai(rows, constraints)
            else:
                return [{"error": f"Domain {domain} not supported"}]

            # --- Apply granular constraints as a post-processing step ---
            if constraints:
                # Convert granular constraints to AugmentationRules for post-processing
                augmentation_rules = []
                for constraint in constraints:
                    if isinstance(constraint, PercentageConstraint):
                        augmentation_rules.append(
                            AugmentationRule(
                                field=constraint.field,
                                strategy=AugmentationStrategy.TARGET_PERCENTAGE,
                                value=constraint.value,
                                target_percentage=constraint.percentage
                            )
                        )
                    # For ExactValueConstraint and RangeConstraint, we rely on LLM adherence
                    # or more complex post-processing if strict enforcement is needed.
                    # For this iteration, PercentageConstraint is the primary focus for strict enforcement.

                if augmentation_rules:
                    print(f"Post-processing to enforce {len(augmentation_rules)} granular constraints for {domain}...")
                    generated_data = self.augment_data(generated_data, augmentation_rules)
                    print(f"Post-processing for {domain} complete. New count: {len(generated_data)}")
            # --- END NEW ---

            return generated_data

        except Exception as e:
            print(f"❌ AI generation failed for {domain}: {str(e)}")
            # Fallback to basic generation if AI fails
            return self._get_fallback_data(domain, rows)

    def generate_custom_data(self, prompt: str, rows: int = 5,
                             constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = None) -> List[Dict]:
        """Generate custom data based on a free-form prompt using AI with optional constraints"""
        
        constraint_prompt_segment = self._build_constraint_prompt_segment(constraints)

        full_prompt = f"""Generate exactly {rows} records in JSON array format based on the following request:
        "{prompt}"
        {constraint_prompt_segment}
        Ensure the output is a valid JSON array of objects, with no extra text or markdown formatting outside the JSON.
        """
        try:
            print(f"🔄 Generating {rows} custom records with AI based on prompt: {prompt[:50]}...")
            response = self.model.generate_content(full_prompt)
            cleaned_response = self._clean_json_response(response.text)
            
            data = json.loads(cleaned_response)
            
            if isinstance(data, list) and len(data) > 0:
                print(f"✅ Successfully generated {len(data)} custom records")
                # --- Apply granular constraints as a post-processing step ---
                if constraints:
                    augmentation_rules = []
                    for constraint in constraints:
                        if isinstance(constraint, PercentageConstraint):
                            augmentation_rules.append(
                                AugmentationRule(
                                    field=constraint.field,
                                    strategy=AugmentationStrategy.TARGET_PERCENTAGE,
                                    value=constraint.value,
                                    target_percentage=constraint.percentage
                                )
                            )
                    if augmentation_rules:
                        print(f"Post-processing to enforce {len(augmentation_rules)} granular constraints for custom data...")
                        data = self.augment_data(data, augmentation_rules)
                        print(f"Post-processing for custom data complete. New count: {len(data)}")
                # --- END NEW ---
                return data
            else:
                print("❌ Invalid response format for custom generation from AI")
                return self._fallback_custom(rows)
                
        except json.JSONDecodeError as e:
            print(f"❌ Custom JSON parsing failed: {e}")
            print(f"Raw response: {response.text}")
            return self._fallback_custom(rows)
        except Exception as e:
            print(f"❌ Custom AI generation error: {e}")
            return self._fallback_custom(rows)

    def generate_relational_data(self, request: RelationalGenerationRequest) -> Dict[str, List[Dict]]:
        """
        Generates multiple related datasets (tables) based on a defined schema
        with foreign-key relationships and optional global constraints.
        """
        tables_prompt_segment = self._build_relational_schema_prompt(request.tables)
        global_constraint_prompt_segment = self._build_constraint_prompt_segment(request.global_constraints)

        full_prompt = f"""Generate multiple related datasets in a single JSON object.
        The JSON object should have keys corresponding to table names, and values being JSON arrays of records for each table.

        Here are the table schemas and relationships:
        {tables_prompt_segment}
        {global_constraint_prompt_segment}

        Ensure all foreign-key relationships are correctly maintained across tables.
        Return ONLY a single valid JSON object, with no extra text or markdown formatting outside the JSON.
        """
        try:
            print(f"🔄 Generating relational data for {len(request.tables)} tables with AI...")
            response = self.model.generate_content(full_prompt)
            cleaned_response = self._clean_json_response(response.text)

            data = json.loads(cleaned_response)

            if isinstance(data, dict) and all(isinstance(v, list) for v in data.values()):
                print(f"✅ Successfully generated relational data for {len(data)} tables.")
                generated_table_names = set(data.keys())
                requested_table_names = {table.name for table in request.tables}
                if requested_table_names.issubset(generated_table_names):
                    # For relational data, augmentation needs to be applied carefully.
                    # For simplicity, we'll apply it to a flattened list of all records for now.
                    # A more advanced implementation would allow specifying which table to augment.
                    # For strict relational integrity, this would require more sophisticated regeneration or re-mapping.
                    # For this iteration, we'll rely on the LLM's adherence to the prompt for relational constraints.
                    if request.global_constraints:
                         print("Warning: Global constraints on relational data are currently treated as hints to the LLM due to complexity of post-processing while preserving relational integrity.")
                    return data
                else:
                    print(f"❌ Mismatch in generated tables. Requested: {requested_table_names}, Generated: {generated_table_names}")
                    return self._fallback_relational(request.tables)
            else:
                print("❌ Invalid response format for relational generation from AI (expected dict of lists).")
                return self._fallback_relational(request.tables)

        except json.JSONDecodeError as e:
            print(f"❌ Relational JSON parsing failed: {e}")
            print(f"Raw response: {response.text}")
            return self._fallback_relational(request.tables)
        except Exception as e:
            print(f"❌ Relational AI generation error: {e}")
            return self._fallback_relational(request.tables)

    def augment_data(self, original_data: List[Dict], rules: List[AugmentationRule]) -> List[Dict]:
        """
        Augments and rebalances a dataset based on a list of rules.
        This is a post-processing step.
        """
        augmented_data = list(original_data) # Start with a copy of the original data
        original_count = len(original_data)

        for rule in rules:
            if rule.strategy == AugmentationStrategy.TARGET_PERCENTAGE:
                print(f"Applying TARGET_PERCENTAGE rule for field '{rule.field}' with value '{rule.value}' to {rule.target_percentage}%")
                augmented_data = self._apply_target_percentage(augmented_data, rule.field, rule.value, rule.target_percentage)
            elif rule.strategy == AugmentationStrategy.BALANCE_CATEGORIES:
                print(f"Applying BALANCE_CATEGORIES rule for field '{rule.field}'")
                augmented_data = self._balance_categories(augmented_data, rule.field)
            elif rule.strategy == AugmentationStrategy.OVERSAMPLE_VALUE:
                print(f"Applying OVERSAMPLE_VALUE rule for field '{rule.field}' with value '{rule.value}' to {rule.target_count} records")
                augmented_data = self._oversample_value(augmented_data, rule.field, rule.value, rule.target_count)
            # Add more strategy implementations here

        print(f"Data augmentation complete. Original count: {original_count}, Augmented count: {len(augmented_data)}")
        return augmented_data

    def _apply_target_percentage(self, data: List[Dict], field: str, value: Any, target_percentage: float) -> List[Dict]:
        """
        Adjusts data to ensure a target percentage of records have a specific value in a field.
        This version is more robust in introducing the target value if initially missing.
        """
        if not data:
            return []

        # Make a mutable copy of the data list
        current_data = list(data)

        current_records_with_value = [record for record in current_data if record.get(field) == value]
        current_count = len(current_records_with_value)
        total_records = len(current_data)

        desired_count = int(round(target_percentage / 100 * total_records))

        print(f"  -> Current count of '{value}' in '{field}': {current_count}/{total_records} ({current_count/total_records*100:.1f}%)")
        print(f"  -> Desired count: {desired_count}")

        if current_count < desired_count:
            num_to_add = desired_count - current_count
            print(f"  -> Need to ADD {num_to_add} records with '{field}' = '{value}'")

            # Find records that DO NOT have the target value, to potentially modify them
            records_without_value = [record for record in current_data if record.get(field) != value]
            
            if len(records_without_value) >= num_to_add:
                # If there are enough records without the value, modify them
                random.shuffle(records_without_value)
                for i in range(num_to_add):
                    records_without_value[i][field] = value
                # Reconstruct data: modified records + original records with value + remaining records without value
                current_data = records_with_value + records_without_value
            else:
                # Not enough records to modify. Modify all available non-target records,
                # and then duplicate existing target records or create new ones if needed.
                print(f"  -> Not enough records WITHOUT '{value}' to modify. Modifying all available and duplicating/creating.")
                for record in records_without_value:
                    record[field] = value
                
                remaining_to_add = num_to_add - len(records_without_value)
                current_data = records_with_value + records_without_value # All now have the target value

                if remaining_to_add > 0:
                    # If we still need more, duplicate existing ones with the target value
                    if current_data: # If there's any data now
                        for _ in range(remaining_to_add):
                            current_data.append(random.choice(current_data).copy())
                    else: # If data was completely empty to begin with
                        for _ in range(remaining_to_add):
                            current_data.append({field: value}) # Create basic records
                
        elif current_count > desired_count:
            num_to_remove = current_count - desired_count
            print(f"  -> Need to REMOVE {num_to_remove} records with '{field}' = '{value}'")

            records_with_value = [record for record in current_data if record.get(field) == value]
            records_without_value = [record for record in current_data if record.get(field) != value]

            if num_to_remove >= len(records_with_value):
                # If we need to remove all or more than exist, just keep records without value
                current_data = records_without_value
            else:
                # Randomly remove records with the target value
                random.shuffle(records_with_value)
                current_data = records_without_value + records_with_value[num_to_remove:]
        
        return current_data

    def _balance_categories(self, data: List[Dict], field: str) -> List[Dict]:
        """Balances the distribution of categories in a specified field by oversampling smaller categories."""
        if not data:
            return []

        # Make a mutable copy of the data list
        current_data = list(data)

        # Count occurrences of each category
        category_counts = Counter(record.get(field) for record in current_data if field in record)
        if not category_counts:
            return current_data # No categories found for the field

        # Determine the target count for each category (aim for the largest group size)
        target_count_per_category = max(category_counts.values())
        
        balanced_data = []
        for category, count in category_counts.items():
            if category is None: # Handle records where the field is missing
                balanced_data.extend([record for record in current_data if field not in record or record.get(field) is None])
                continue

            records_in_category = [record for record in current_data if record.get(field) == category]
            
            if count < target_count_per_category:
                num_to_add = target_count_per_category - count
                if records_in_category:
                    for _ in range(num_to_add):
                        balanced_data.append(random.choice(records_in_category).copy())
                else:
                    print(f"Warning: No existing records for category '{category}' in field '{field}' to oversample. Cannot balance this category effectively.")
                    balanced_data.extend(records_in_category)
            else:
                balanced_data.extend(records_in_category)
        
        return balanced_data

    def _oversample_value(self, data: List[Dict], field: str, value: Any, target_count: int) -> List[Dict]:
        """Oversamples records with a specific value in a field to reach a target count."""
        # Make a mutable copy of the data list
        current_data = list(data)

        current_records_with_value = [record for record in current_data if record.get(field) == value]
        current_count = len(current_records_with_value)
        
        print(f"  -> Current count of '{value}' in '{field}': {current_count}")
        print(f"  -> Desired count: {target_count}")

        if current_count < target_count:
            num_to_add = target_count - current_count
            print(f"  -> Need to ADD {num_to_add} records with '{field}' = '{value}'")

            candidates = [record for record in current_data if record.get(field) == value]
            
            if not candidates:
                print(f"Warning: No existing records with '{field}' = '{value}' to oversample. Creating new records by modifying existing ones.")
                if current_data:
                    for _ in range(num_to_add):
                        modified_record = random.choice(current_data).copy()
                        modified_record[field] = value
                        current_data.append(modified_record)
                else:
                    for _ in range(num_to_add):
                        current_data.append({field: value}) # Create a very basic record
                return current_data
            
            for _ in range(num_to_add):
                current_data.append(random.choice(candidates).copy()) # Add a copy
        
        return current_data

    def _clean_json_response(self, response_text: str) -> str:
        """Clean AI response to extract valid JSON"""
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*$', '', response_text)
        
        # Remove any text before the JSON array starts or JSON object starts
        json_start_array = response_text.find('[')
        json_start_object = response_text.find('{')
        
        # Determine the earliest valid JSON start
        json_start = -1
        if json_start_array != -1 and json_start_object != -1:
            json_start = min(json_start_array, json_start_object)
        elif json_start_array != -1:
            json_start = json_start_array
        elif json_start_object != -1:
            json_start = json_start_object

        json_end_array = response_text.rfind(']')
        json_end_object = response_text.rfind('}')

        # Determine the latest valid JSON end
        json_end = -1
        if json_end_array != -1 and json_end_object != -1:
            json_end = max(json_end_array, json_end_object)
        elif json_end_array != -1:
            json_end = json_end_array
        elif json_end_object != -1:
            json_end = json_end_object
        
        if json_start != -1 and json_end != -1 and json_end > json_start:
            return response_text[json_start:json_end + 1]
        
        return response_text.strip()

    def _build_constraint_prompt_segment(self, constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]]) -> str:
        """
        Builds a natural language prompt segment from a list of constraint objects.
        """
        if not constraints:
            return ""

        segments = ["\n\nAdditionally, adhere to the following specific data constraints:"]
        for constraint in constraints:
            if isinstance(constraint, PercentageConstraint):
                segments.append(
                    f"- Ensure approximately {constraint.percentage:.1f}% of records have the '{constraint.field}' field set to '{constraint.value}'."
                )
            elif isinstance(constraint, ExactValueConstraint):
                segments.append(
                    f"- The '{constraint.field}' field must be exactly '{constraint.value}' for all relevant records."
                )
            elif isinstance(constraint, RangeConstraint):
                range_desc = []
                if constraint.min_value is not None:
                    range_desc.append(f"greater than or equal to {constraint.min_value}")
                if constraint.max_value is not None:
                    range_desc.append(f"less than or equal to {constraint.max_value}")
                
                if range_desc:
                    segments.append(f"- The '{constraint.field}' field must be {' and '.join(range_desc)}.")
            # Add handling for other constraint types here
        
        return "\n".join(segments)

    def _build_relational_schema_prompt(self, tables: List[TableSchema]) -> str:
        """
        Builds a natural language prompt segment describing the relational schema.
        """
        prompt_lines = []
        for table in tables:
            prompt_lines.append(f"Table Name: {table.name} (Generate {table.rows} rows)")
            prompt_lines.append("Columns:")
            for col in table.columns:
                col_desc = f"  - {col.name} ({col.data_type.value})"
                if col.description:
                    col_desc += f": {col.description}"
                if col.is_primary_key:
                    col_desc += " (Primary Key)"
                if col.is_foreign_key:
                    col_desc += f" (Foreign Key referencing {col.references_table}.{col.references_column})"
                if col.unique and not col.is_primary_key: # PK implies unique
                    col_desc += " (Unique)"
                prompt_lines.append(col_desc)
            prompt_lines.append("") # Add a blank line between tables for readability
        return "\n".join(prompt_lines)
    
    # Fallback methods (same as before)
    def _get_fallback_data(self, domain: str, rows: int) -> List[Dict]:
        """Get fallback data for any domain"""
        fallback_methods = {
            "E-commerce": self._fallback_ecommerce,
            "Healthcare": self._fallback_healthcare,
            "Finance": self._fallback_finance,
            "Marketing": self._fallback_marketing,
            "HR": self._fallback_hr,
            "Custom": self._fallback_custom # Fallback for custom
        }
        
        if domain in fallback_methods:
            print(f"⚠️  Using fallback data for {domain}")
            return fallback_methods[domain](rows)
        else:
            return [{"error": f"Domain {domain} not supported"}]

    def _fallback_relational(self, tables: List[TableSchema]) -> Dict[str, List[Dict]]:
        """Generates fallback data for relational requests."""
        print("⚠️  Using fallback data for relational generation.")
        generated_data = {}
        for table in tables:
            table_data = []
            for i in range(table.rows):
                row = {}
                for col in table.columns:
                    if col.is_primary_key:
                        row[col.name] = f"{table.name.upper()}_{col.name.upper()}_{i+1}"
                    elif col.is_foreign_key:
                        # For fallback, simply generate a placeholder FK value
                        row[col.name] = f"{col.references_table.upper()}_{col.references_column.upper()}_{random.randint(1, table.rows)}"
                    else:
                        # Simple placeholder data based on type
                        if col.data_type == ColumnDataType.INTEGER:
                            row[col.name] = random.randint(1, 100)
                        elif col.data_type == ColumnDataType.FLOAT:
                            row[col.name] = round(random.uniform(1.0, 100.0), 2)
                        elif col.data_type == ColumnDataType.BOOLEAN:
                            row[col.name] = random.choice([True, False])
                        elif col.data_type in [ColumnDataType.DATE, ColumnDataType.DATETIME]:
                            row[col.name] = datetime.now().isoformat()
                        else: # Default to string
                            row[col.name] = f"{col.name}_{i+1}"
                table_data.append(row)
            generated_data[table.name] = table_data
        return generated_data

    # Fallback methods (same as before)
    def _fallback_ecommerce(self, rows: int) -> List[Dict]:
        products = ["iPhone 15", "Samsung Galaxy S24", "MacBook Pro", "AirPods Pro", "iPad Air"]
        return [{
            "product_id": f"PROD_{random.randint(10000, 99999)}", 
            "product_name": random.choice(products), 
            "brand": "Generic", 
            "price": round(random.uniform(99.99, 1299.99), 2),
            "category": "Electronics",
            "description": "High-quality product",
            "stock_quantity": random.randint(1, 100),
            "rating": round(random.uniform(4.0, 5.0), 1),
            "reviews_count": random.randint(50, 1000)
        } for i in range(rows)]
    
    def _fallback_healthcare(self, rows: int) -> List[Dict]:
        return [{
            "patient_id": f"P{random.randint(10000, 99999)}", 
            "patient_name": f"Patient {i+1}", 
            "age": random.randint(25, 65),
            "gender": random.choice(["Male", "Female"]),
            "diagnosis": random.choice(["Hypertension", "Diabetes", "Common Cold"]),
            "specialty": "General Medicine",
            "treatment": "Standard treatment",
            "severity": "Moderate"
        } for i in range(rows)]
    
    def _fallback_finance(self, rows: int) -> List[Dict]:
        return [{
            "transaction_id": f"TXN_{random.randint(100000, 999999)}", 
            "account_id": f"ACC_{random.randint(1000, 9999)}",
            "transaction_type": "Purchase",
            "amount": round(random.uniform(-500, 500), 2),
            "category": "General",
            "merchant": "Generic Store"
        } for i in range(rows)]
    
    def _fallback_marketing(self, rows: int) -> List[Dict]:
        return [{
            "customer_id": f"CUST_{random.randint(10000, 99999)}", 
            "customer_name": f"Customer {i+1}", 
            "email": f"customer{i+1}@email.com",
            "segment": "General"
        } for i in range(rows)]
    
    def _fallback_hr(self, rows: int) -> List[Dict]:
        return [{
            "employee_id": f"EMP_{random.randint(1000, 9999)}", 
            "employee_name": f"Employee {i+1}",
            "department": "General",
            "job_title": "Employee"
        } for i in range(rows)]

    def _fallback_custom(self, rows: int) -> List[Dict]:
        return [{"id": i + 1, "data": f"Custom fallback data {i+1}"} for i in range(rows)]
