# Job Search Assistant

A powerful tool to manage job applications, analyze job descriptions, and generate tailored career documents using AI-driven heuristics.

## Features
- **Smart Link Analysis**: Extract company, position, and description directly from job URLs.
- **AI Fit Score**: Re-evaluate matching skills (JavaScript, MySQL, PHP, etc.) between your profile and the job.
- **Career Document Scanning**: Scan your CV and certificates to automatically update your skill profile.
- **Tailored Documents**: Generate customized cover letters and CV summaries.
- **macOS Integration**: Easy startup with a dedicated `.app` bundle.

---

## Getting Started

### Prerequisites
- **PHP 8.2+**
- **Composer**
- **Node.js & npm**
- **SQLite**

### Installation
1. Clone the repository.
2. Install PHP dependencies:
   ```bash
   composer install
   ```
3. Install Frontend dependencies:
   ```bash
   npm install
   ```
4. Setup environment:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
5. Initialize Database:
   ```bash
   touch database/database.sqlite
   php artisan migrate
   ```

---

## How to Run

### Option 1: macOS App (Recommended)
Simply open `JobAssistant.app` from your Applications or project folder. It will handle starting the servers and opening the UI automatically.

### Option 2: Command Line (Normal Run)
If you prefer running the servers manually from your terminal, follow these steps:

1. **Start the Laravel Backend**:
   ```bash
   php artisan serve
   ```
   *Application will be available at http://127.0.0.1:8000*

2. **Start the Vite Frontend** (in a new terminal tab):
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   Open your browser and navigate to `http://127.0.0.1:8000`.

---

## Development
To rebuild the macOS application bundle after making changes to the startup scripts:
```bash
./build_macos_app.sh
```

## License
Open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
