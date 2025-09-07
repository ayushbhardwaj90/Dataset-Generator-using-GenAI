# 🚀 Dataset Generator using Generative AI

## 📌 Overview
An end-to-end web application that allows users to generate synthetic datasets using Google Gemini 2.5 API.  
Users can describe the dataset they want in natural language, and the app generates structured data (CSV/Excel).

## ✨ Features
- 🔹 **Generate synthetic datasets** with natural language prompts  
- 🔹 Supports **custom constraints** and column definitions  
- 🔹 Download datasets in **CSV/Excel format**  
- 🔹 Keeps a history of generated datasets  
- 🔹 User authentication (Login / Register / Password Reset)  
- 🔹 Frontend: React.js + Tailwind CSS  
- 🔹 Backend: Python (FastAPI/Flask) + Gemini API  



Dataset-Generator-using-GenAI/
│── Backend/              # Python backend (API + Gemini integration)
│   ├── main.py
│   ├── generator.py
│   ├── models.py
│   ├── exports.py
│   ├── schemas.py
│   ├── requirements.txt
│
│── Frontend/             # React frontend (UI components)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/     # Login/Register/Reset forms
│   │   │   ├── data/     # Dataset forms & tables
│   │   │   └── views/    # History, Getting Started etc.
│   │   └── App.js
│   ├── package.json
│
│── .gitignore
│── README.md


**Bold Text**🛠️ Tech Stack

_Italic Text_ Frontend: React.js, Tailwind CSS

_Italic Text_ Backend: FastAPI/Flask, Python

_Italic Text_ Generative AI: Google Gemini 2.5 API

_Italic Text_ Database: SQLite (for history & auth)

🔮 Future Enhancements

✅ More robust data validation pipeline

✅ Prompt auto-correction for invalid inputs

✅ Support for JSON and Parquet export

✅ Multi-language dataset generation
