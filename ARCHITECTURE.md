# System Architecture & Technical Workflow

This document provides a deep dive into how the Job Search Assistant functions internally, detailing the data flow, core logic, and feature set.

---

## 1. High-Level Architecture
The application follows a **Decoupled Monolith** architecture:
- **Backend (API)**: Laravel 11 provides a RESTful API, handles authentication, database persistence, and communicates with AI models.
- **Frontend**: A React-based Single Page Application (SPA) built with Vite, providing a fast, modern user experience with Framer Motion animations.
- **AI Integration Layer**: A service-oriented layer that manages connections to Google Gemini and OpenAI, including fallback logic and vector processing.

---

## 2. Technical Workflow: "The Analysis Path"
When a user submits a job link, the following synchronous process occurs:

1.  **Request Capture**: `JobController@store` receives the URL and validates it.
2.  **Deep Scraping**:
    - The `performAnalysis` method fetches the HTML.
    - If it detects an `iframe` (common in portals like Onlyfy), it recursively fetches the inner content.
3.  **Context Assembly**: The app retrieves the User's Profile (skills/experience) and merges it with the scraped job text.
4.  **AI Fit Analysis**: 
    - The cleaned text is sent to **Google Gemini (2.0 Flash)**.
    - The AI extracts the exact company, refined title, and a list of matching vs. missing skills.
5.  **Semantic Match (RAG)**:
    - The `EmbeddingService` converts the job description into a vector.
    - It performs a **Cosine Similarity** math operation against the user's background vector.
6.  **Persistence**: Results are saved to SQLite and returned as JSON to the React frontend.

---

## 3. Important Files & Directory Structure

### **Backend (The Brain)**
- `app/Http/Controllers/JobController.php`: The primary engine for job scraping, AI analysis wrapper, and document generation.
- `app/Services/AI/EmbeddingService.php`: Manages vector creation (Embeddings) and mathematical similarity calculations.
- `app/Http/Controllers/ProfileController.php`: Handles user skill extraction and profile vector updates.
- `routes/api.php`: Defines the API endpoints for the React frontend.

### **Frontend (The Face)**
- `resources/js/components/Dashboard.jsx`: The main hub for adding jobs and viewing the analysis drawer.
- `resources/js/components/ApplicationsPage.jsx`: List view with sorting by AI Fit and status.
- `resources/js/components/InterviewsPage.jsx`: Tracking interview schedules and preparation.

---

## 4. Main Functions (Code Level)

| Function | Location | Purpose |
| :--- | :--- | :--- |
| `performAnalysis($url)` | `JobController.php` | The main "orchestrator" for scraping and AI calls. |
| `callAI($prompt)` | `JobController.php` | Manages the Gemini-to-OpenAI fallback logic. |
| `getEmbedding($text)` | `EmbeddingService.php` | Convers text to a 3072-dimension vector. |
| `cosineSimilarity($v1, $v2)` | `EmbeddingService.php` | Calculates the math score between two skills profiles. |
| `reEvaluate()` | `ProfileController.php` | Extracts new skills from a user's typed experience. |

---

## 5. Core Features

### **A. Smart Link Extraction**
- Uses specialized regex to find real company names (e.g., looking for "GmbH" or "AG").
- Bypasses job portal wrappers (Onlyfy, Prescreen) to get the actual requirements.

### **B. Conceptual "Semantic" Match**
- Goes beyond keyword matching. It understands that "PHP" and "Laravel" are related, and "Frontend" matches "React."

### **C. Resume & Cover Letter Tailoring**
- Generates a custom Cover Letter that highlights the "Matching Skills" identified in the analysis using professional local templates (No AI dependence).
- Summarizes the user's CV to make it "ATS-Friendly" for that specific role.

### **D. Application Tracking**
- Full Move-to-Interview workflow.
- Synchronization between Job status and Interview schedules.

---

## 6. AI Connection Map

| Context | Primary Model | Fallback Model | Data Type |
| :--- | :--- | :--- | :--- |
| **Analysis** | Gemini 2.0 Flash | OpenAI GPT-4o Mini | JSON Data |
| **Embeddings** | Gemini-Embedding-001 | OpenAI Text-Embedding-3 | Numeric Vectors |
| **Generation** | Local Template | N/A | Markdown/Text |
