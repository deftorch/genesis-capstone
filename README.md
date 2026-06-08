# Genesis

Genesis is a premium, highly interactive creative AI assistant specialized in generating and rendering visual content using **p5.js**, **D3.js**, **SVG**, and **Mermaid.js** sandboxed inside iframe isolation containers.

---

## 🚀 Key Features

*   **Generative Art & Visualizations**: Interact with AI to compile live previews of visual code (p5.js sketches, D3.js data charts, Mermaid flowcharts, SVG illustrations).
*   **Sandboxed Runtimes**: Renders user-generated canvas scripts securely inside scoped iframes using strict origin policies (`sandbox="allow-scripts"`).
*   **Multi-Turn Conversations**: Utilizes the official Google Gemini API structure with system prompts and structural message arrays.
*   **API Key Rotation**: Automatically falls back and rotates between a cluster of configured Gemini API keys to guarantee maximum uptime.
*   **Safe Uploads**: Validates file types by matching their binary headers (magic bytes) to prevent malicious code injection.

---

## 🛠️ Tech Stack

*   **Framework**: Next.js 15 (App Router, Standalone Output)
*   **Frontend**: React 18, Tailwind CSS, Lucide React, Zustand State Management
*   **Model Provider**: Google Generative AI (Gemini 1.5, 2.0, 2.5, 3.0 series)
*   **Visual Engines**: p5.js, D3.js, Mermaid, SVG
*   **Development & Testing Tooling**: Bun Runtime, PM2, TypeScript, ESLint

---

## ⚙️ Environment Variables

Create a `.env.local` (for development) or `.env` (for production) file in the root directory:

```env
# Gemini API Configuration
# Multiple keys can be separated by commas for automated key rotation
GEMINI_API_KEYS=your_first_key,your_second_key

# Model Settings
NEXT_PUBLIC_DEFAULT_MODEL=gemini-3-flash

# Cleanup Endpoint Security Token
CRON_TOKEN=a-long-securely-generated-secret-token
```

---

## 📦 Getting Started

### Installation
Ensure you have the [Bun runtime](https://bun.sh/) installed:

```bash
bun install
```

### Run in Development
Launch the Next.js development server:

```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
Generate the optimized standalone build:

```bash
bun run build
```

---

## 🖥️ PM2 Process Management
Genesis is pre-configured for PM2 deployments. Run the application in production mode using:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# View active logs
pm2 logs genesis
```

The production logs will be written to `./logs/out.log` and `./logs/err.log`. Ensure the `logs` folder exists before running PM2 in production.

---

## 🔒 Security Measures

1.  **XSS Protection**: Markdown rendering utilizes `rehype-sanitize` to purge unsafe HTML tags and scripts.
2.  **SSRF Shield**: Image analysis fetches validate input URLs against internal/private IP ranges (RFC 1918) prior to dispatching HTTP requests.
3.  **Iframe Isolation**: Rendering iframes exclude `allow-same-origin` to isolate client session details (cookies/localStorage) from generated canvas scripts.
4.  **MIME Verification**: Image uploads inspect hex magic numbers (`FFD8FF`, `89504E47`, `47494638`, `52494646`) to avoid extension spoofing.