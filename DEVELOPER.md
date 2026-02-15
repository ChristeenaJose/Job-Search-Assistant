# Developer Documentation: Job Search Assistant

This document explains the internal architecture, AI integrations, and technical workflows of the Job Search Assistant.

---

## 1. Overview Architecture
The application is a modern full-stack web application built with:
- **Backend**: Laravel 11 (PHP 8.2+)
- **Frontend**: React 18 with Vite and Tailwind CSS
- **Database**: SQLite (Default) or PostgreSQL (Supported for Production/Vector Search)
- **AI Engine**: Hybrid integration of Google Gemini (Primary) and OpenAI (Fallback)

---

## 2. AI & LLM Connections

The core intelligence of the app resides in `app/Http/Controllers/JobController.php` and `app/Services/AI/EmbeddingService.php`.

### A. AI Model Selection
The app uses a hierarchical fallback system to ensure maximum availability:
1.  **Google Gemini 2.0 Flash** (Primary for speed & price)
2.  **Google Gemini 1.5 Flash** (Fallback if 2.0 is rate-limited)
3.  **OpenAI GPT-4o Mini** (Manual fallback/Secondary)

### B. Specific AI Functions
- **Job Analysis**: Processes scraped job text to extract Company Name, Position, Match Score, and Skills.
- **Skill Extraction**: Analyzes user background to build a technical profile.
- **Document Generation**: Creates tailored Cover Letters and CV summaries based on the job-user match.
- **Embeddings**: Uses `models/gemini-embedding-001` (3072 dimensions) to convert text into mathematical vectors for semantic comparison.

---

## 3. The Scraping Engine (Deep Scanning)

Since many job portals (like Onlyfy/Prescreen) hide content inside `<iframe>` tags, the application uses a **Deep Scraper** workflow:

1.  **Initial Fetch**: Requests the job URL using Laravel's HTTP client with a standard Browser User-Agent.
2.  **Iframe Detection**: Searches the HTML for specific job-board frame patterns (e.g., `id="jobFrame"`).
3.  **Recursive Fetch**: If an iframe is found, the system follows the `src` link to the "inner" job description page.
4.  **Cleaning**: The combined HTML is stripped of scripts, styles, and navigation to provide a "clean" text block to the AI.

---

## 4. Semantic Matching (RAG Logic)

The app implements "Conceptual Matching" rather than just keyword matching:

1.  **Vectorization**: When you add a job, its description is turned into a 3072-dimensional vector.
2.  **Cosine Similarity**: The app compares the **Job Vector** against your **Profile Vector**.
3.  **The Score**: The "Semantic Match %" represents how closely your professional background concept matches the job's requirement concept, even if the exact words are different (e.g., matching "Frontend" with "React").

---

## 5. Database & Vector Search

The application is designed to be **Database Agnostic**:
- **SQLite**: Stores embeddings as `JSON` columns.
- **PostgreSQL**: Supports the `pgvector` extension for high-performance vector searches.
- **Migrations**: The file `database/migrations/..._enable_pgvector_and_add_embeddings_to_tables.php` automatically detects the database driver and sets up the appropriate column type.

---

## 6. Rate Limits & Quotas (Free Tier)

Since the app uses the **Free Tier** of Google Gemini, developers should be aware of:
- **Rate Limit**: 15 requests per minute.
- **Daily Quota**: 1,500 requests per day.
- **Logging**: Failed AI calls are logged in `storage/logs/laravel.log`. If you see a `429` error, the app will automatically attempt a fallback or wait for the next minute.

---

## 7. Key Files to Know
- `app/Http/Controllers/JobController.php`: Manages job scraping and analysis logic.
- `app/Services/AI/EmbeddingService.php`: Core logic for vector generation and similarity math.
- `resources/js/components/Dashboard.jsx`: Main interface for job tracking.
- `config/services.php`: Configuration for API keys.

---

## 8. Troubleshooting
- **Missing Score**: Ensure you have filled out your **User Profile** (Skills & Experience) first. The app cannot calculate a match without your background.
- **Wrong Company Name**: Usually caused by portals hiding the real employer behind a login or a protected iframe. The scraper is updated regularly to handle new portal structures.
