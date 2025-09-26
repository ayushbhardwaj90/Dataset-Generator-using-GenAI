# ayushbhardwaj90/dataset-generator-using-genai/Dataset-Generator-using-GenAI-79155e47a57111fac9d81a099df114ccf1eeb342/generator.py

import json
import os
import random
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import google.generativeai as genai
from dotenv import load_dotenv

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
    
    def refine_prompt(self, prompt: str) -> Optional[str]:
        """
        Uses Gemini to refine a vague or informal user prompt into a clear, structured prompt
        for dataset generation.
        """
        refinement_prompt = f"""
        Analyze the following user request for a dataset. If the request is vague, informal, or incomplete, rewrite it into a clear, professional, and structured prompt that can be used to generate a dataset. The refined prompt should explicitly state the number of rows, the column names, and their data types.

        If the prompt is completely incomprehensible or lacks sufficient detail to create a dataset, respond with "VAGUE_PROMPT".

        Example 1:
        User: "Make a student marksheet thingy with name and maths n science. like 200 lines"
        Refined: "Generate a dataset with 200 rows and columns: Student Name (string), Maths (integer), Science (integer)."

        Example 2:
        User: "1000 row pls name age salary female male ratio thing"
        Refined: "Generate a dataset with 1000 rows and columns: Name (string), Age (integer), Gender (string), Salary (integer)."

        Example 3:
        User: "plz 200 records marks for maths science bio eng kids 15 yr old"
        Refined: "Generate a dataset with 200 rows and columns: Student Name (string), Age (integer, default 15), Maths Marks (integer), Science Marks (integer), Biology Marks (integer), English Marks (integer)."

        User input: "{prompt}"
        Refined: 
        """
        try:
            print("🔄 Refining user prompt with Gemini...")
            response = self.model.generate_content(refinement_prompt)
            refined_text = response.text.strip()
            print(f"✅ Prompt refined. Output: {refined_text}")
            
            if refined_text == "VAGUE_PROMPT":
                return None
            return refined_text
        except Exception as e:
            print(f"❌ Prompt refinement failed: {e}")
            return None

    def _generate_in_batches(self, base_prompt: str, total_rows: int, batch_size: int = 50) -> List[Dict]:
        """Generates data in batches to ensure consistency for large datasets."""
        all_data = []
        num_batches = (total_rows + batch_size - 1) // batch_size
        
        # New: Remove existing row count from the base prompt before batching
        # The prompt from refine_prompt looks like "Generate a dataset with {rows} rows..."
        # This regex will remove that part so the batching logic can add it back correctly.
        cleaned_base_prompt = re.sub(r'Generate a dataset with \d+ rows and columns:', 'Generate a dataset with the following columns:', base_prompt.strip())
        
        for i in range(num_batches):
            rows_to_generate = min(batch_size, total_rows - len(all_data))
            if rows_to_generate <= 0:
                break
                
            batch_prompt = f"{cleaned_base_prompt}\n\nGenerate exactly {rows_to_generate} records."
            
            try:
                print(f"🔄 Generating batch {i+1}/{num_batches} for {rows_to_generate} rows...")
                response = self.model.generate_content(batch_prompt)
                cleaned_response = self._clean_json_response(response.text)
                batch_data = json.loads(cleaned_response)
                
                if isinstance(batch_data, list):
                    all_data.extend(batch_data)
                else:
                    print(f"❌ Invalid response format for batch {i+1}, skipping.")

            except Exception as e:
                print(f"❌ Error generating batch {i+1}: {e}, attempting to continue...")
        
        print(f"✅ Batch generation complete. Total records: {len(all_data)} of {total_rows} requested.")
        return all_data

    def generate_sample_data(self, domain: str, rows: int = 5,
                             constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = None, custom_prompt: Optional[str] = None) -> List[Dict]:
        """Generate realistic sample data using AI for a specific domain with optional constraints"""
        
        # FIX: Simplified and more direct prompt to prevent AI confusion
        base_prompt = f"Generate a dataset for the {domain} domain with {rows} records. The data should be tailored to these specific requirements: '{custom_prompt}'"

        base_prompt += self._build_constraint_prompt_segment(constraints)
        base_prompt += "\nReturn only a valid JSON array of objects, with no extra text or markdown."

        generated_data = self._generate_in_batches(base_prompt, rows)

        # NEW: Check if generated_data is empty, and if so, return fallback data.
        if not generated_data:
            print(f"❌ AI generation failed for {domain}, using fallback data.")
            return self._get_fallback_data(domain, rows)

        return generated_data

    def generate_custom_data(self, prompt: str, rows: int = 5,
                             constraints: Optional[List[Union[PercentageConstraint, ExactValueConstraint, RangeConstraint]]] = None) -> List[Dict]:
        """
        Generate custom data based on a free-form prompt using AI with optional constraints.
        This function now expects a refined prompt to be passed to it.
        """
        constraint_prompt_segment = self._build_constraint_prompt_segment(constraints)

        # FIX: Replaced the multi-line prompt with a single, clear instruction
        base_prompt = f"{re.sub(r'Generate a dataset with \d+ rows and columns:', 'Generate a dataset with the following columns:', prompt.strip())}{constraint_prompt_segment}\nReturn only a valid JSON array of objects, with no extra text or markdown."

        generated_data = self._generate_in_batches(base_prompt, rows)

        # FIX: The hardcoded fallback has been replaced with a dynamic call.
        if not generated_data:
            print("❌ Invalid response format for custom generation from AI, using fallback.")
            return self._get_fallback_data("Custom", rows)

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
                generated_data = self.augment_data(generated_data, augmentation_rules)
                print(f"Post-processing for custom data complete. New count: {len(generated_data)}")

        return generated_data

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
        augmented_data = list(original_data)
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

        print(f"Data augmentation complete. Original count: {original_count}, Augmented count: {len(augmented_data)}")
        return augmented_data

    def _apply_target_percentage(self, data: List[Dict], field: str, value: Any, target_percentage: float) -> List[Dict]:
        """
        Adjusts data to ensure a target percentage of records have a specific value in a field.
        This version is more robust in introducing the target value if initially missing.
        """
        if not data:
            return []
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
            records_without_value = [record for record in current_data if record.get(field) != value]
            if len(records_without_value) >= num_to_add:
                random.shuffle(records_without_value)
                for i in range(num_to_add):
                    records_without_value[i][field] = value
                current_data = records_with_value + records_without_value
            else:
                print(f"  -> Not enough records WITHOUT '{value}' to modify. Modifying all available and duplicating/creating.")
                for record in records_without_value:
                    record[field] = value
                remaining_to_add = num_to_add - len(records_without_value)
                current_data = records_with_value + records_without_value
                if remaining_to_add > 0:
                    if current_data:
                        for _ in range(remaining_to_add):
                            current_data.append(random.choice(current_data).copy())
                    else:
                        for _ in range(remaining_to_add):
                            current_data.append({field: value})
        elif current_count > desired_count:
            num_to_remove = current_count - desired_count
            print(f"  -> Need to REMOVE {num_to_remove} records with '{field}' = '{value}'")
            records_with_value = [record for record in current_data if record.get(field) == value]
            records_without_value = [record for record in current_data if record.get(field) != value]
            if num_to_remove >= len(records_with_value):
                current_data = records_without_value
            else:
                random.shuffle(records_with_value)
                current_data = records_without_value + records_with_value[num_to_remove:]
        return current_data

    def _balance_categories(self, data: List[Dict], field: str) -> List[Dict]:
        """Balances the distribution of categories in a specified field by oversampling smaller categories."""
        if not data:
            return []
        current_data = list(data)
        category_counts = Counter(record.get(field) for record in current_data if field in record)
        if not category_counts:
            return current_data
        target_count_per_category = max(category_counts.values())
        balanced_data = []
        for category, count in category_counts.items():
            if category is None:
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
                        current_data.append({field: value})
                return current_data
            for _ in range(num_to_add):
                current_data.append(random.choice(candidates).copy())
        return current_data

    def _clean_json_response(self, response_text: str) -> str:
        """Clean AI response to extract valid JSON"""
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*$', '', response_text)
        json_start_array = response_text.find('[')
        json_start_object = response_text.find('{')
        json_start = -1
        if json_start_array != -1 and json_start_object != -1:
            json_start = min(json_start_array, json_start_object)
        elif json_start_array != -1:
            json_start = json_start_array
        elif json_start_object != -1:
            json_start = json_start_object
        json_end_array = response_text.rfind(']')
        json_end_object = response_text.rfind('}')
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
                if col.unique and not col.is_primary_key:
                    col_desc += " (Unique)"
                prompt_lines.append(col_desc)
            prompt_lines.append("")
        return "\n".join(prompt_lines)
    
    def _get_fallback_data(self, domain: str, rows: int) -> List[Dict]:
        """Get fallback data for any domain"""
        fallback_methods = {
            "E-commerce": self._fallback_ecommerce,
            "Healthcare": self._fallback_healthcare,
            "Finance": self._fallback_finance,
            "Marketing": self._fallback_marketing,
            "HR": self._fallback_hr,
            "Custom": self._fallback_custom
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
                        row[col.name] = f"{col.references_table.upper()}_{col.references_column.upper()}_{random.randint(1, table.rows)}"
                    else:
                        if col.data_type == ColumnDataType.INTEGER:
                            row[col.name] = random.randint(1, 100)
                        elif col.data_type == ColumnDataType.FLOAT:
                            row[col.name] = round(random.uniform(1.0, 100.0), 2)
                        elif col.data_type == ColumnDataType.BOOLEAN:
                            row[col.name] = random.choice([True, False])
                        elif col.data_type in [ColumnDataType.DATE, ColumnDataType.DATETIME]:
                            row[col.name] = datetime.now().isoformat()
                        else:
                            row[col.name] = f"{col.name}_{i+1}"
                table_data.append(row)
            generated_data[table.name] = table_data
        return generated_data

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