import json
from io import StringIO
from typing import Dict, List

import pandas as pd


class DataExporter:
    def to_csv(self, data: List[Dict]) -> str:
        """Convert data to CSV format"""
        if not data:
            return ""
        
        df = pd.DataFrame(data)
        return df.to_csv(index=False)
    
    def to_json(self, data: List[Dict]) -> str:
        """Convert data to formatted JSON"""
        return json.dumps(data, indent=2)
    
    def to_excel_bytes(self, data: List[Dict]) -> bytes:
        """Convert data to Excel format and return as bytes"""
        if not data:
            return b""
        
        df = pd.DataFrame(data)
        
        # Use BytesIO to create Excel file in memory
        from io import BytesIO
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Dataset')
        
        output.seek(0)
        return output.getvalue()


# Global exporter instance
exporter = DataExporter()