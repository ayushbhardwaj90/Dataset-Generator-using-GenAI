import json
from io import BytesIO
from typing import Dict, List, Union

import pandas as pd

class DataExporter:
    def to_csv(self, data: List[Dict]) -> str:
        """Convert data to CSV format"""
        print(f"🔍 Exporter: Converting {len(data) if data else 0} records to CSV")
        if not data:
            print("🔍 Exporter: No data provided for CSV export")
            return ""
        try:
            df = pd.DataFrame(data)
            print(f"🔍 Exporter: DataFrame created with shape {df.shape}")
            print(f"🔍 Exporter: CSV columns: {list(df.columns)}")
            csv_content = df.to_csv(index=False)
            print(f"🔍 Exporter: CSV content generated, length: {len(csv_content)}")
            return csv_content
        except Exception as e:
            print(f"🔍 Exporter: CSV conversion error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: CSV error traceback: {traceback.format_exc()}")
            raise e

    def to_json(self, data: Union[List[Dict], Dict]) -> str:
        """Convert data to formatted JSON"""
        if isinstance(data, list):
            record_count = len(data)
            data_type = "list"
        elif isinstance(data, dict):
            record_count = sum(
                len(table_data) for table_data in data.values() if isinstance(table_data, list)
            )
            data_type = "dict"
        else:
            record_count = 0
            data_type = str(type(data))
        print(f"🔍 Exporter: Converting {record_count} records to JSON (type: {data_type})")
        if not data:
            print("🔍 Exporter: No data provided for JSON export")
            return "[]"
        try:
            json_content = json.dumps(data, indent=2, ensure_ascii=False, default=str)
            print(f"🔍 Exporter: JSON content generated, length: {len(json_content)}")
            return json_content
        except Exception as e:
            print(f"🔍 Exporter: JSON conversion error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: JSON error traceback: {traceback.format_exc()}")
            raise e

    def to_excel_bytes(self, data: List[Dict]) -> bytes:
        """Convert data to Excel format and return as bytes"""
        print(f"🔍 Exporter: Converting {len(data) if data else 0} records to Excel")
        if not data:
            print("🔍 Exporter: No data provided for Excel export")
            return b""
        try:
            df = pd.DataFrame(data)
            print(f"🔍 Exporter: DataFrame created with shape {df.shape}")
            print(f"🔍 Exporter: DataFrame columns: {list(df.columns)}")

            output = BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Dataset")
                worksheet = writer.sheets["Dataset"]
                # Auto-adjust column widths
                for column in df.columns:
                    column_length = max(df[column].astype(str).map(len).max(), len(column))
                    col_idx = df.columns.get_loc(column)
                    worksheet.column_dimensions[
                        worksheet.cell(row=1, column=col_idx + 1).column_letter
                    ].width = min(column_length + 2, 50)

            output.seek(0)
            excel_bytes = output.getvalue()
            print(f"🔍 Exporter: Excel bytes generated, length: {len(excel_bytes)}")
            if excel_bytes[:4] == b"PK\x03\x04":
                print("🔍 Exporter: Excel file signature verified (valid .xlsx file)")
            else:
                print(
                    f"🔍 Exporter: WARNING - Excel signature mismatch. First 10 bytes: {excel_bytes[:10]}"
                )
            return excel_bytes
        except Exception as e:
            print(f"🔍 Exporter: Excel conversion error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: Excel error traceback: {traceback.format_exc()}")
            raise e

    def to_excel_bytes_relational(self, data: Dict[str, List[Dict]]) -> bytes:
        """Convert relational data to Excel format with multiple sheets"""
        print(f"🔍 Exporter: Converting relational data to Excel ({len(data)} tables)")
        if not data:
            print("🔍 Exporter: No relational data provided for Excel export")
            return b""
        try:
            output = BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                sheet_count = 0
                for table_name, table_data in data.items():
                    if table_data and len(table_data) > 0:
                        df = pd.DataFrame(table_data)
                        # Clean and limit sheet name (Excel constraints)
                        clean_name = (
                            table_name.replace("/", "_")
                            .replace("\\", "_")
                            .replace("[", "_")
                            .replace("]", "_")
                            .replace("*", "_")
                            .replace("?", "_")
                            .replace(":", "_")
                        )[:31]
                        # Ensure uniqueness
                        existing = [s.title for s in writer.book.worksheets]
                        if clean_name in existing:
                            clean_name = f"{clean_name[:28]}_{sheet_count}"
                        df.to_excel(writer, sheet_name=clean_name, index=False)

                        worksheet = writer.sheets[clean_name]
                        for column in df.columns:
                            column_length = max(
                                df[column].astype(str).map(len).max(), len(column)
                            )
                            col_idx = df.columns.get_loc(column)
                            worksheet.column_dimensions[
                                worksheet.cell(row=1, column=col_idx + 1).column_letter
                            ].width = min(column_length + 2, 50)

                        print(
                            f"🔍 Exporter: Created sheet '{clean_name}' with {len(table_data)} records"
                        )
                        sheet_count += 1
                    else:
                        print(f"🔍 Exporter: Skipping empty table '{table_name}'")

            if sheet_count == 0:
                print("🔍 Exporter: No valid data found in any table")
                return b""

            output.seek(0)
            excel_bytes = output.getvalue()
            print(
                f"🔍 Exporter: Relational Excel generated with {sheet_count} sheets, length: {len(excel_bytes)}"
            )
            if excel_bytes[:4] == b"PK\x03\x04":
                print("🔍 Exporter: Relational Excel file signature verified")
            else:
                print("🔍 Exporter: WARNING - Relational Excel signature not found")
            return excel_bytes
        except Exception as e:
            print(f"🔍 Exporter: Relational Excel error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: Relational Excel error traceback: {traceback.format_exc()}")
            raise e

    def to_excel_fallback(self, data: List[Dict]) -> str:
        """Fallback: Excel-compatible CSV (UTF-8 BOM)"""
        print("🔍 Exporter: Using Excel fallback (CSV format)")
        if not data:
            print("🔍 Exporter: No data for Excel fallback")
            return ""
        try:
            df = pd.DataFrame(data)
            csv_content = df.to_csv(index=False, encoding="utf-8-sig")
            print(f"🔍 Exporter: Excel fallback CSV generated, length: {len(csv_content)}")
            return csv_content
        except Exception as e:
            print(f"🔍 Exporter: Excel fallback error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: Excel fallback error traceback: {traceback.format_exc()}")
            raise e

    def to_csv_relational(self, data: Dict[str, List[Dict]]) -> str:
        """Flatten relational data to CSV with table identifiers"""
        print(f"🔍 Exporter: Converting relational data to CSV ({len(data)} tables)")
        if not data:
            print("🔍 Exporter: No relational data provided for CSV export")
            return ""
        try:
            all_records: List[Dict] = []
            for table_name, table_data in data.items():
                if table_data and len(table_data) > 0:
                    for record in table_data:
                        enhanced_record = record.copy()
                        enhanced_record["_table_name"] = table_name
                        all_records.append(enhanced_record)
                    print(
                        f"🔍 Exporter: Added {len(table_data)} records from table '{table_name}'"
                    )
            if not all_records:
                print("🔍 Exporter: No records found in any table")
                return ""
            df = pd.DataFrame(all_records)
            cols = df.columns.tolist()
            if "_table_name" in cols:
                cols = ["_table_name"] + [c for c in cols if c != "_table_name"]
                df = df[cols]
            csv_content = df.to_csv(index=False)
            print(
                f"🔍 Exporter: Relational CSV generated with {len(all_records)} total records"
            )
            return csv_content
        except Exception as e:
            print(f"🔍 Exporter: Relational CSV error: {str(e)}")
            import traceback
            print(f"🔍 Exporter: Relational CSV error traceback: {traceback.format_exc()}")
            raise e

# Global exporter instance
exporter = DataExporter()

