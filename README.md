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



## 📂 Project Structure
```Dataset-Generator-using-GenAI/
│── Backend/ # Python backend (API + Gemini integration)
│ ├── main.py # Entry point for backend
│ ├── generator.py # Synthetic dataset generator logic
│ ├── models.py # Database models
│ ├── exports.py # CSV/Excel export utilities
│ ├── schemas.py # Request/response schemas
│ ├── requirements.txt # Backend dependencies
│
│── Frontend/ # React frontend (UI components)
│ ├── public/ # Static files
│ ├── src/
│ │ ├── components/
│ │ │ ├── auth/ # Login/Register/Password Reset forms
│ │ │ ├── data/ # Dataset forms & tables
│ │ │ └── views/ # History, Getting Started, etc.
│ │ └── App.js # Main React app entry point
│ ├── package.json # Frontend dependencies
│
│── .gitignore
│── README.md
```
## 🛠️ Tech Stack

- **Frontend:** *React.js, Tailwind CSS*  
- **Backend:** *FastAPI / Flask (Python)*  
- **Gen AI Integration:** *Google Gemini 2.5 API*  
- **Database:** *SQLite *  

---

## 🔮 Future Enhancements

- [x] More robust data validation pipeline  
- [ ] Prompt auto-correction for invalid inputs  
- [ ] Support for JSON and Parquet export  
- [ ] Multi-language dataset generation  

  

